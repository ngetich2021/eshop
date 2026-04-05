import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
     interface Session {
   user: {
      id:             string;
      name?:          string | null;
      email?:         string | null;
      image?:         string | null;
      role:           string;           
      designation:    string | null;
      shopId:         string | null;    
      allowedRoutes:  string[];         
    };
  }


    interface User {
    role?:          string;
    designation?:   string | null;
    shopId?:        string | null;
    allowedRoutes?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role:        string;
    designation: string | null;
  }
}