export type UserRole = 'admin' | 'tenant';
export type UnitStatus = 'occupied' | 'vacant' | 'under_maintenance';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  unit_number: string;
  floor: number | null;
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  rent_amount: number;
  status: UnitStatus;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: number;
  unit_id: number;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  security_deposit: number | null;
  lease_document_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  unit?: Unit;
  tenant?: User;
}

export interface Payment {
  id: number;
  lease_id: number;
  tenant_id: string;
  amount_paid: number;
  payment_date: string;
  payment_for_month: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  // Relations
  lease?: Lease;
  tenant?: User;
}

export interface MaintenanceRequest {
  id: number;
  unit_id: number;
  tenant_id: string;
  request_details: string;
  status: MaintenanceStatus;
  image_url: string | null;
  date_submitted: string;
  date_completed: string | null;
  notes: string | null;
  // Relations
  unit?: Unit;
  tenant?: User;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  author_id: string | null;
  created_at: string;
  // Relations
  author?: User;
}

export interface ChatConversation {
  id: number;
  tenant_id: string;
  admin_id: string | null;
  last_message_at: string;
  tenant_unread_count: number;
  admin_unread_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  tenant?: User;
  admin?: User;
  latest_message?: ChatMessage;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  // Relations
  sender?: User;
  conversation?: ChatConversation;
}