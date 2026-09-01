export type ActorRole = "learner" | "platform_admin";

export type CurrentActor = {
  id: string;
  role: ActorRole;
};
