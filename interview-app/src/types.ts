export interface Interview {
  id: number;
  title: string;
  job_role: string;
  description?: string;
  status: string;
  username: string;
}

export interface Question {
  id: number;
  interview_id: number;
  question: string;
  difficulty: string;
  username: string;
}

export interface Applicant {
  id: number;
  interview_id: number;
  title: string;
  firstname: string;
  surname: string;
  phone_number?: string;
  email_address: string;
  interview_status: string;
  username: string;
}

export interface ApplicantAnswer {
  id: number;
  interview_id: number;
  question_id: number;
  applicant_id: number;
  answer?: string;
  username: string;
}
