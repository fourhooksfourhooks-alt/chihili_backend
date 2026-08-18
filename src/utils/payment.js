import { StandardCheckoutClient, Env } from "pg-sdk-node";
import { config } from "../config/env.js";

let clientInstance = null;

export function getPhonePeClient() {
  if (!clientInstance) {
    const environment =
      process.env.PAYMENT_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX;

    clientInstance = StandardCheckoutClient.getInstance(
      config.phonepe_client,
      config.phonepe_secret,
      1,
      environment
    );
  }
  return clientInstance;
}
