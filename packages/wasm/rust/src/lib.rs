//! WebAssembly bindings for TNID.
//!
//! This crate provides wasm-bindgen exports for TNID functionality,
//! allowing TNIDs to be used from JavaScript/TypeScript.
//!
//! All functions use strings as the primary interface to avoid
//! BigInt/u128 complexity at the JS boundary.

use tnid::{Case, DynamicTnid, NameStr, TnidVariant};
use wasm_bindgen::prelude::*;

/// Parse a TNID string and return it (validates the TNID).
///
/// Returns the same string if valid, or throws an error if invalid.
#[wasm_bindgen]
pub fn parse(tnid_str: &str) -> Result<String, JsError> {
    let tnid = DynamicTnid::parse_tnid_string(tnid_str)?;
    Ok(tnid.to_string())
}

/// Parse a UUID string with the given name and return a TNID string.
#[wasm_bindgen]
pub fn parse_uuid(uuid_str: &str) -> Result<String, JsError> {
    let tnid = DynamicTnid::parse_uuid_string(uuid_str)?;
    Ok(tnid.to_string())
}

/// Create a new V0 (time-ordered) TNID.
///
/// # Arguments
/// * `name` - The TNID name (1-4 characters)
/// * `timestamp_ms` - Unix timestamp in milliseconds (from Date.now())
/// * `random_hex` - 16 hex characters (8 bytes / 64 bits of randomness)
#[wasm_bindgen]
pub fn new_v0(name: &str, timestamp_ms: f64, random_hex: &str) -> Result<String, JsError> {
    let name = NameStr::new(name).map_err(|e| JsError::new(&e.to_string()))?;

    // Parse random_hex as a u64
    if random_hex.len() != 16 {
        return Err(JsError::new(
            "random_hex must be exactly 16 hex characters (8 bytes)",
        ));
    }
    let random =
        u64::from_str_radix(random_hex, 16).map_err(|e| JsError::new(&e.to_string()))?;

    let tnid = DynamicTnid::new_v0_with_parts(name, timestamp_ms as u64, random);
    Ok(tnid.to_string())
}

/// Create a new V1 (high-entropy) TNID.
///
/// # Arguments
/// * `name` - The TNID name (1-4 characters)
/// * `random_hex` - 32 hex characters (16 bytes / 128 bits of randomness)
#[wasm_bindgen]
pub fn new_v1(name: &str, random_hex: &str) -> Result<String, JsError> {
    let name = NameStr::new(name).map_err(|e| JsError::new(&e.to_string()))?;

    // Parse random_hex as a u128
    if random_hex.len() != 32 {
        return Err(JsError::new(
            "random_hex must be exactly 32 hex characters (16 bytes)",
        ));
    }
    let random =
        u128::from_str_radix(random_hex, 16).map_err(|e| JsError::new(&e.to_string()))?;

    let tnid = DynamicTnid::new_v1_with_random(name, random);
    Ok(tnid.to_string())
}

/// Convert a TNID to its UUID string representation.
///
/// Returns lowercase UUID format (e.g., "550e8400-e29b-41d4-a716-446655440000").
#[wasm_bindgen]
pub fn to_uuid_string(tnid_str: &str) -> Result<String, JsError> {
    let tnid = DynamicTnid::parse_tnid_string(tnid_str)?;
    Ok(tnid.to_uuid_string(Case::Lower))
}

/// Get the variant of a TNID ("v0", "v1", "v2", or "v3").
#[wasm_bindgen]
pub fn get_variant(tnid_str: &str) -> Result<String, JsError> {
    let tnid = DynamicTnid::parse_tnid_string(tnid_str)?;
    let variant_str = match tnid.variant() {
        TnidVariant::V0 => "v0",
        TnidVariant::V1 => "v1",
        TnidVariant::V2 => "v2",
        TnidVariant::V3 => "v3",
    };
    Ok(variant_str.to_string())
}

/// Get the name portion of a TNID.
#[wasm_bindgen]
pub fn get_name(tnid_str: &str) -> Result<String, JsError> {
    let tnid = DynamicTnid::parse_tnid_string(tnid_str)?;
    Ok(tnid.name())
}

/// Encrypt a V0 TNID to V1 format.
///
/// # Arguments
/// * `tnid_str` - A V0 TNID string
/// * `key_hex` - 32 hex characters (16 bytes / 128-bit AES key)
#[wasm_bindgen]
pub fn encrypt_v0_to_v1(tnid_str: &str, key_hex: &str) -> Result<String, JsError> {
    use tnid::encryption::EncryptionKey;

    let tnid = DynamicTnid::parse_tnid_string(tnid_str)?;
    let key = EncryptionKey::from_hex(key_hex).map_err(|e| JsError::new(&e.to_string()))?;

    let encrypted = tnid
        .encrypt_v0_to_v1(key)
        .map_err(|e| JsError::new(&e.to_string()))?;
    Ok(encrypted.to_string())
}

/// Decrypt a V1 TNID back to V0 format.
///
/// # Arguments
/// * `tnid_str` - A V1 TNID string (that was encrypted from V0)
/// * `key_hex` - 32 hex characters (16 bytes / 128-bit AES key)
#[wasm_bindgen]
pub fn decrypt_v1_to_v0(tnid_str: &str, key_hex: &str) -> Result<String, JsError> {
    use tnid::encryption::EncryptionKey;

    let tnid = DynamicTnid::parse_tnid_string(tnid_str)?;
    let key = EncryptionKey::from_hex(key_hex).map_err(|e| JsError::new(&e.to_string()))?;

    let decrypted = tnid
        .decrypt_v1_to_v0(key)
        .map_err(|e| JsError::new(&e.to_string()))?;
    Ok(decrypted.to_string())
}

/// Validate a TNID name string.
///
/// Returns true if the name is valid (1-4 characters from the allowed set).
#[wasm_bindgen]
pub fn is_valid_name(name: &str) -> bool {
    NameStr::new(name).is_ok()
}
