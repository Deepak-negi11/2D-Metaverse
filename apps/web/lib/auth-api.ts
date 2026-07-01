import { apiRequest } from "./api-client";
export { AUTH_TOKEN_KEY } from "./auth-token";

export type SignupInput = {
  username: string;
  email: string;
  password: string;
};

export type SigninInput = {
  email: string;
  password: string;
};

export function signupUser(input: SignupInput) {
  return apiRequest<{ userId: string }, SignupInput>("/api/v1/signup", {
    method: "POST",
    body: input,
  });
}

export function signinUser(input: SigninInput) {
  return apiRequest<{ token: string }, SigninInput>("/api/v1/signin", {
    method: "POST",
    body: input,
  });
}
