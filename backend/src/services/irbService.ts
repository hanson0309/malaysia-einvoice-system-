import crypto from 'crypto';
import axios from 'axios';
import { AES, enc } from 'crypto-js';
import { config } from '../config/env';

interface IRBConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

interface TaxpayerSearchResult {
  tin: string;
}

interface DocumentSubmissionResponse {
  acceptedDocuments?: Array<{ uuid: string }>;
  rejectedDocuments?: Array<{ error: any }>;
  error?: any;
  statusCode?: number;
}

class IRBService {
  private baseUrl: string;
  private tokenCache: Map<string, string> = new Map();

  constructor() {
    this.baseUrl = process.env.MYINVOIS_BASE_URL || 'https://api.myinvois.hasil.gov.my';
  }

  /**
   * Get credentials from environment variables
   * Returns null if credentials are not configured
   */
  getEnvironmentCredentials(): { clientId: string; clientSecret: string } | null {
    const clientId = config.MYINVOIS_CLIENT_ID;
    const clientSecret = config.MYINVOIS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    return { clientId, clientSecret };
  }

  /**
   * 获取 OAuth access token
   */
  async getToken(clientId: string, clientSecret: string): Promise<string> {
    try {
      console.log('=== IRB TOKEN REQUEST ===');
      console.log('Base URL:', this.baseUrl);
      console.log('Client ID:', clientId);
      console.log('Client Secret:', clientSecret ? '***' + clientSecret.slice(-4) : 'NOT SET');

      const response = await axios.post(
        `${this.baseUrl}/connect/token`,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
          scope: 'InvoicingAPI'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('Token obtained successfully');
      return response.data.access_token;
    } catch (error: any) {
      console.error('=== IRB TOKEN ERROR ===');
      console.error('Status:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Headers:', error.response?.headers);

      if (error.response?.status === 429) {
        // Rate limit - retry after delay
        const resetTime = error.response.headers['x-rate-limit-reset'];
        if (resetTime) {
          const waitTime = new Date(resetTime).getTime() - Date.now();
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.getToken(clientId, clientSecret);
          }
        }
      }

      const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      throw new Error(`Failed to get IRB token: ${errorDetails}`);
    }
  }

  /**
   * 根据 NRIC 查询 TIN
   */
  async getTinByNric(nric: string, accessToken: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1.0/taxpayer/search/tin?idType=NRIC&idValue=${nric}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data.tin;
    } catch (error: any) {
      if (error.response?.status === 429) {
        const resetTime = error.response.headers['x-rate-limit-reset'];
        if (resetTime) {
          const waitTime = new Date(resetTime).getTime() - Date.now();
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.getTinByNric(nric, accessToken);
          }
        }
      }
      // Return default TIN if not found
      return 'EI00000000010';
    }
  }

  /**
   * 验证纳税人 (Validate Taxpayer)
   */
  async validateTaxpayer(
    idType: string,
    idValue: string,
    tin: string,
    accessToken: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1.0/taxpayer/validate`,
        {
          idType: idType,
          idValue: idValue,
          tin: tin
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Taxpayer validation error:', error.response?.data || error.message);
      throw new Error(`Failed to validate taxpayer: ${error.message}`);
    }
  }

  /**
   * 提交发票到 IRB
   */
  async submitDocument(
    document: any,
    codeNumber: string,
    accessToken: string
  ): Promise<DocumentSubmissionResponse> {
    try {
      const jsonString = JSON.stringify(document, null, 0);
      const base64String = Buffer.from(jsonString).toString('base64');
      const documentHash = crypto
        .createHash('sha256')
        .update(base64String, 'base64')
        .digest('hex')
        .toUpperCase();

      console.log('=== SUBMITTING DOCUMENT ===');
      console.log('Code Number:', codeNumber);
      console.log('Document Hash:', documentHash);
      console.log('Base64 length:', base64String.length);
      console.log('Full Document JSON:');
      console.log(jsonString);

      const response = await axios.post(
        `${this.baseUrl}/api/v1.0/documentsubmissions/`,
        {
          documents: [
            {
              format: 'JSON',
              documentHash: documentHash,
              codeNumber: codeNumber,
              document: base64String
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log('=== SUBMISSION RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('=== SUBMISSION ERROR ===');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));

      if (error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  /**
   * 获取文档详情
   */
  async getDocumentDetails(uuid: string, accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1.0/documents/${uuid}/details`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get document details: ${error.message}`);
    }
  }

  /**
   * 轮询 IRB 状态直到 Valid 或 Invalid
   * 跟 server.js 的 pollAndSaveStatus 一样
   */
  async pollDocumentStatus(
    uuid: string,
    accessToken: string,
    maxAttempts: number = 10,
    delayMs: number = 5000
  ): Promise<any> {
    let attempt = 0;
    let status = '';
    let lastResponse: any = null;

    console.log(`Starting to poll document ${uuid} status...`);

    while (attempt < maxAttempts) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/api/v1.0/documents/${uuid}/details`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        lastResponse = response.data;
        status = lastResponse.status;

        console.log(`Poll attempt ${attempt + 1}/${maxAttempts}: Status = ${status}`);

        // 如果状态是 Valid 或 Invalid，停止轮询
        if (status === 'Valid' || status === 'Invalid') {
          console.log(`Final status reached: ${status}`);
          break;
        }
      } catch (error: any) {
        console.error(`Error polling IRB status (attempt ${attempt + 1}):`, error.message);
      }

      // 等待后再次尝试
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }

    if (status !== 'Valid' && status !== 'Invalid') {
      console.warn(`Polling timed out after ${maxAttempts} attempts. Last status: ${status}`);
    }

    return lastResponse;
  }

  /**
   * 解密敏感数据
   */
  decrypt(encryptedData: string, accountId: string): string {
    const secret = `${accountId}${process.env.ENCRYPTION_KEY}`;
    return AES.decrypt(encryptedData, secret).toString(enc.Utf8);
  }

  /**
   * 加密敏感数据
   */
  encrypt(data: string, accountId: string): string {
    const secret = `${accountId}${process.env.ENCRYPTION_KEY}`;
    return AES.encrypt(data, secret).toString();
  }
}

export const irbService = new IRBService();
