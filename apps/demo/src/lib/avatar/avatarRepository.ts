import type {
  Avatar,
  AvatarCreateInput,
  AvatarLibrary,
  AvatarUpdateInput,
} from "./avatarTypes";

export class AvatarRepositoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "AvatarRepositoryError";
  }
}

export interface AvatarRepository {
  list(): Promise<AvatarLibrary>;
  create(input: AvatarCreateInput): Promise<Avatar>;
  update(id: string, input: AvatarUpdateInput): Promise<Avatar>;
  delete(id: string): Promise<AvatarLibrary>;
  setDefault(id: string): Promise<Avatar>;
}
