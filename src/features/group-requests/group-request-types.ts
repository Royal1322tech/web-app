export type GroupRequestStatus = "saved_locally" | "under_review" | "quotation_sent" | "in_discussion" | "closed";
export type GroupRequestService = "hotels" | "transport" | "both";

export interface NewGroupRequest {
  name: string;
  email: string;
  agency: string;
  subject: string;
  destination: string;
  start: string;
  end: string;
  passengers: number;
  rooms?: number;
  service: GroupRequestService;
  message: string;
}

export interface GroupRequest extends NewGroupRequest {
  reference: string;
  ownerId: string;
  status: GroupRequestStatus;
  createdAt: string;
  /** "sample" is illustrative fixture data; "local-preview" was saved in this browser session only. */
  origin: "sample" | "local-preview";
}

/** The group quotation form's values, as entered. */
export interface GroupFormValues {
  name: string;
  email: string;
  phone: string;
  phoneCountry: string;
  agency: string;
  subject: string;
  message: string;
  destination: string;
  start: string;
  end: string;
  passengers: string;
  rooms: string;
  service: GroupRequestService;
}
