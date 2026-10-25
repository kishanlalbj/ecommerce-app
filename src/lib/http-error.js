export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message = "Bad request") => new HttpError(400, message);
export const unauthorized = (message = "Authentication required") => new HttpError(401, message);
export const forbidden = (message = "You do not have permission to do this") => new HttpError(403, message);
export const notFound = (message = "Not found") => new HttpError(404, message);
export const conflict = (message = "Conflict") => new HttpError(409, message);
