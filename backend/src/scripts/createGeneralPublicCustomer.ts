import mongoose from 'mongoose';
import { Customer } from '../models/Customer';
import { Tenant } from '../models/Tenant';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/malaysia-einvoice';

async function createGeneralPublicCustomer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all tenants
    const tenants = await Tenant.find();
    console.log(`Found ${tenants.length} tenants`);

    for (const tenant of tenants) {
      // Check if General Public customer already exists
      const existing = await Customer.findOne({
        tenant_id: tenant._id,
        name: 'General Public',
      });

      if (existing) {
        console.log(`General Public customer already exists for tenant: ${tenant.company_name}`);
        continue;
      }

      // Create General Public customer with valid TIN and ID
      // Note: For consolidated invoices, you should use a real customer
      // This is just a placeholder for walk-in customers
      const generalPublic = await Customer.create({
        tenant_id: tenant._id,
        name: 'General Public',
        email: 'general@public.my',
        phone: '+60123456789',
        tin_number: 'C2584563200', // Example valid TIN format
        registration_no: '202001234567', // Example valid BRN format
        id_type: 'BRN',
        address_line1: 'No. 1, Jalan Contoh',
        city: 'Kuala Lumpur',
        postcode: '50000',
        state_code: '14', // Selangor
        country_code: 'MYS',
      });

      console.log(`✅ Created General Public customer for tenant: ${tenant.company_name}`);
    }

    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

createGeneralPublicCustomer();
