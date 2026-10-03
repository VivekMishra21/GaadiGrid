import axios from 'axios';

// The contact + partner-enquiry forms are stored by the GaadiGrid website's own API
// (website/src/app/api/*), not the FastAPI backend, so they get their own base URL and
// a plain axios instance (no auth header / token-refresh interceptors).
export const WEBSITE_BASE_URL = process.env.EXPO_PUBLIC_WEBSITE_BASE_URL || 'http://localhost:3000';

const websiteClient = axios.create({ baseURL: WEBSITE_BASE_URL, timeout: 15000 });

async function post(path, payload) {
  try {
    const res = await websiteClient.post(path, payload);
    return res.data;
  } catch (err) {
    const message = err.response?.data?.error;
    throw { message: message || 'Network error. Please try again.', status: err.response?.status };
  }
}

export function submitContactMessage({ name, email, subject, message }) {
  return post('/api/contact', { name, email, subject, message });
}

export function submitPartnerEnquiry({ businessName, contactName, phone, email, businessType, city, message }) {
  return post('/api/partner-enquiry', { businessName, contactName, phone, email, businessType, city, message });
}
