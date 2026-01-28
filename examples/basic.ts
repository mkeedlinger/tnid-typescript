/**
 * TNID TypeScript Example
 * Run with: deno run example.ts
 */

import { DynamicTnid, Tnid, TnidType, UuidLike } from "../src/index.ts";

// =============================================================================
// Typed TNIDs - compile-time name validation
// =============================================================================

const UserId = Tnid("user");
const PostId = Tnid("post");
type UserId = TnidType<typeof UserId>;
type PostId = TnidType<typeof PostId>;

const userId: UserId = UserId.new_v0(); // time-sorted
const postId: PostId = PostId.new_v1(); // random

console.log("Typed TNIDs:");
console.log(`  UserId.new_v0(): ${userId}`);
console.log(`  PostId.new_v1(): ${postId}`);
console.log(`  UserId.parse():  ${UserId.parse(userId.toString())}`);

// =============================================================================
// DynamicTnid - runtime name validation
// =============================================================================

console.log("\nDynamicTnid:");
console.log(`  .new_v0("item"): ${DynamicTnid.new_v0("item")}`);

// Parse any TNID string (name not known at compile time)
const anyTnid: DynamicTnid = DynamicTnid.parse(postId.toString());
console.log(`  .parse():        ${anyTnid}`);
console.log(`  .getName():      ${DynamicTnid.getName(anyTnid)}`);
console.log(`  .getVariant():   ${DynamicTnid.getVariant(anyTnid)}`);

// =============================================================================
// UuidLike - any UUID hex string (may or may not be a valid TNID)
// =============================================================================

console.log("\nUuidLike:");

const uuid: UuidLike = UuidLike.fromTnid(userId);
console.log(`  .fromTnid():     ${uuid}`);

// Parse any UUID format (no TNID validation, just format)
const anyUuid: UuidLike = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");
console.log(`  .parse():        ${anyUuid}`);

// Convert back to DynamicTnid (validates TNID structure)
console.log(`  .toTnid():       ${UuidLike.toTnid(uuid)}`);

// =============================================================================
// Type safety - DynamicTnid accepts any typed TNID
// =============================================================================

console.log("\nType safety:");
function logAny(id: DynamicTnid) {
  console.log(`  ${DynamicTnid.getName(id)}: ${id}`);
}
logAny(userId);
logAny(postId);

// Compile errors (uncomment to see):
// const wrong: UserId = postId;        // different names incompatible
// const wrong: UserId = "user.abc..."; // plain string not assignable
// Tnid("users");                       // name too long (max 4)
