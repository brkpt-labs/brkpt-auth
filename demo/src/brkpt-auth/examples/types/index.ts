export type AuthJwtPayload = {
  sub: number;
  email: string;
};

export interface UserProfile {
  email: string;
  name: string;
}
