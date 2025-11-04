import { cookies, headers } from "next/headers";
import {
  createRouteHandlerClient,
  createServerActionClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";

import { Database } from "./database.types";

const config = {
  cookies,
  headers,
};

export const createSupabaseServerComponentClient = () =>
  createServerComponentClient<Database>(config);

export const createSupabaseRouteHandlerClient = () =>
  createRouteHandlerClient<Database>(config);

export const createSupabaseServerActionClient = () =>
  createServerActionClient<Database>(config);

