export type {
  Profile,
  UpdateableProfileFields,
} from "./profile";

export {
  CONSENT_FEATURES,
  isConsentFeature,
  deriveConsentState,
} from "./consent";

export type {
  ConsentFeature,
  ConsentAction,
  ConsentRecord,
  ConsentRequest,
  ConsentState,
} from "./consent";
