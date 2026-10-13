// GET → whether the owner is signed in, and which storage the server uses ("blob" or "local").
import { isSignedIn, json } from "./_lib/auth.js";
import { storageMode } from "./_lib/store.js";

export async function GET(request) {
  return json({ signedIn: isSignedIn(request), storage: storageMode });
}
