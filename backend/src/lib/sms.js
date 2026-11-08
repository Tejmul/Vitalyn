import { config } from "../config.js";

/**
 * SMS sending through MSG91's Flow API (https://control.msg91.com/api/v5/flow/):
 * POST, `authkey` header, body { flow_id, sender, recipients: [{ mobiles, ...variables }] },
 * success response { type: "success", message: "<request id>" }.
 *
 * Without MSG91 keys, a console sender logs the message instead (development only).
 */

const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow/";

const msg91 = {
  name: "msg91",
  async send({ flowId, mobile, vars }) {
    const res = await fetch(MSG91_FLOW_URL, {
      method: "POST",
      headers: { authkey: config.msg91.authKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        [config.msg91.flowField]: flowId,
        ...(config.msg91.senderId ? { sender: config.msg91.senderId } : {}),
        recipients: [{ mobiles: `91${mobile}`, ...vars }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.type !== "success") {
      throw new Error(`MSG91: ${body.message ?? `HTTP ${res.status}`}`);
    }
    return { providerId: body.message ?? null };
  },
};

const consoleSender = {
  name: "console",
  async send({ flowId, mobile, vars }) {
    console.log(`[sms:dev] to ${mobile} flow=${flowId || "-"} ${JSON.stringify(vars)}`);
    return { providerId: null };
  },
};

/** True when real SMS will be sent for OTPs. */
export const otpSmsLive = () => Boolean(config.msg91.authKey && config.msg91.otpFlowId);

export function smsSender() {
  return config.msg91.authKey ? msg91 : consoleSender;
}
