```ts
const UserId = Tnid("user"); // some way to create the actual type name. string is type checked to be correct at compile time!!
type UserId = Something<UserId>;

let some_user: UserId = UserId.new_v0();

assert(typeof some_user === "string"); // the actual runtime type of tnids are strings, but they're type branded as UserId

let some_user_string = some_user.to_string();
let another_user: UserId = UserId.parse("test.Bry3Z-JB6GPSNKcWk"); // throws an error if invalid, or name doesn't match
```
