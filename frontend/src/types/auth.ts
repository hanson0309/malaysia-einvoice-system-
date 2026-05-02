export interface RegisterData {
  company_name: string;
  company_registration_no: string;
  tin_number: string;
  business_activity_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  state_code: string;
  country_code: string;
  email: string;
  phone: string;
  password: string;
  sst_registration_no?: string;
}
