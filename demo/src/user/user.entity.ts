export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  verifiedEmail: string | null;
}
