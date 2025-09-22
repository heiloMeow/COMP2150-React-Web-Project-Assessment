export interface Interview {
  id: number;
  title: string;
  job_role: string;
  description?: string;
  status: 'Draft' | 'Published' | 'Archived';
  username: string;
  created_at?: string;
}

export interface Question {
  id: number;
  interview_id: number;
  question: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  username: string;
  created_at?: string;
}

export interface Applicant {
  id: number;
  interview_id: number;
  title: string;
  firstname: string;
  surname: string;
  phone_number?: string;
  email_address: string;
  interview_status: 'Not Started' | 'Completed';
  username: string;
  created_at?: string;
}

export interface ApplicantAnswer {
  id: number;
  interview_id: number;
  question_id: number;
  applicant_id: number;
  answer?: string;
  username: string;
  created_at?: string;
}
