export interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required: boolean;
  placeholder: string;
  options?: string[]; // for select type
}

export interface EventRecord {
  id?: string;
  title: string;
  status: string;
  date: string;
  image_url: string;
  description: string;
  location: string;
  time: string;
  registration_enabled?: boolean;
  form_fields?: string; // JSON string of FormFieldConfig[]
}

export interface DownloadRecord {
  id?: string;
  title: string;
  url: string;
  description: string;
  category: string;
  type: string;
}

export interface GalleryRecord {
  id?: string;
  title: string;
  image_url: string;
  caption: string;
  category: string;
}

export interface RegistrationRecord {
  id: string;
  event_id?: string;
  event_title?: string;
  form_data?: string; // JSON string of submitted form values
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  program: string;
  location: string;
  note: string;
  created_at: string;
}

export const emptyEvent: EventRecord = {
  title: '', status: 'upcoming', date: '', image_url: '', description: '',
  location: '', time: '', registration_enabled: false, form_fields: '[]',
};
export const emptyDownload: DownloadRecord = { title: '', url: '', description: '', category: '', type: '' };
export const emptyGallery: GalleryRecord = { title: '', image_url: '', caption: '', category: '' };
