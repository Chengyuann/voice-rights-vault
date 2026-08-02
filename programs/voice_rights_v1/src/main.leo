// VoiceRights Vault: private, usage-limited AI voice licenses on Aleo.
struct RevocationSeed {
    voice_commitment: field,
    license_nonce: field,
}

struct ReceiptCommitmentSeed {
    creator: address,
    voice_commitment: field,
    purpose: u8,
    content_commitment: field,
    policy_commitment: field,
    used_at_height: u32,
    license_nonce: field,
    use_index: u32,
}

const MAX_INCLUSION_DELAY: u32 = 120u32;

program voice_rights_v1.aleo {
    // Minimal public state. The random revocation ID does not reveal the
    // licensee, voice, purpose, policy, expiry, or remaining quota.
    mapping revoked: field => bool;
    mapping public_receipts: field => bool;

    record VoiceIdentity {
        owner: address,
        voice_commitment: field,
        issuer_commitment: field,
        policy_root: field,
        identity_version: u32,
        issued_licenses: u32,
    }

    record VoiceLicense {
        owner: address,
        creator: address,
        voice_commitment: field,
        purpose: u8,
        policy_commitment: field,
        expiry_height: u32,
        remaining_uses: u32,
        revocation_id: field,
        license_nonce: field,
    }

    record UsageReceipt {
        owner: address,
        creator: address,
        voice_commitment: field,
        purpose: u8,
        content_commitment: field,
        policy_commitment: field,
        used_at_height: u32,
        license_nonce: field,
        use_index: u32,
    }

    // Registers a private voice identity. Raw audio and speaker embeddings
    // remain off-chain; only salted commitments enter this program.
    fn register_voice(
        voice_commitment: field,
        issuer_commitment: field,
        policy_root: field,
    ) -> VoiceIdentity {
        assert_neq(voice_commitment, 0field);
        assert_neq(issuer_commitment, 0field);
        assert_neq(policy_root, 0field);

        return VoiceIdentity {
            owner: std::ctx::signer(),
            voice_commitment,
            issuer_commitment,
            policy_root,
            identity_version: 1u32,
            issued_licenses: 0u32,
        };
    }

    // Consumes the creator's current identity state and returns its next
    // version together with a private license owned by the licensee.
    fn issue_license(
        identity: VoiceIdentity,
        licensee: address,
        purpose: u8,
        policy_commitment: field,
        expiry_height: u32,
        max_uses: u32,
        license_nonce: field,
    ) -> (VoiceIdentity, VoiceLicense) {
        assert_eq(identity.owner, std::ctx::signer());
        assert(purpose > 0u8);
        assert_neq(policy_commitment, 0field);
        assert(expiry_height > 0u32);
        assert(max_uses > 0u32);
        assert_neq(license_nonce, 0field);
        let revocation_id: field = BHP256::hash_to_field(
            RevocationSeed {
                voice_commitment: identity.voice_commitment,
                license_nonce,
            }
        );

        let updated_identity: VoiceIdentity = VoiceIdentity {
            owner: identity.owner,
            voice_commitment: identity.voice_commitment,
            issuer_commitment: identity.issuer_commitment,
            policy_root: identity.policy_root,
            identity_version: identity.identity_version + 1u32,
            issued_licenses: identity.issued_licenses + 1u32,
        };

        let license: VoiceLicense = VoiceLicense {
            owner: licensee,
            creator: identity.owner,
            voice_commitment: identity.voice_commitment,
            purpose,
            policy_commitment,
            expiry_height,
            remaining_uses: max_uses,
            revocation_id,
            license_nonce,
        };

        return (updated_identity, license);
    }

    // Consumes one use from a private license. The private-state transition is
    // wrapped with public finalization checks so clients cannot bypass
    // revocation or claim a height outside the bounded inclusion window.
    fn use_license(
        license: VoiceLicense,
        requested_purpose: u8,
        content_commitment: field,
        claimed_height: u32,
    ) -> (VoiceLicense, UsageReceipt, Final) {
        let revocation_id: field = license.revocation_id;
        assert_eq(license.owner, std::ctx::signer());
        assert_eq(requested_purpose, license.purpose);
        assert_neq(content_commitment, 0field);
        assert(license.remaining_uses > 0u32);
        assert(claimed_height <= license.expiry_height);

        let next_remaining: u32 = license.remaining_uses - 1u32;
        let next_license: VoiceLicense = VoiceLicense {
            owner: license.owner,
            creator: license.creator,
            voice_commitment: license.voice_commitment,
            purpose: license.purpose,
            policy_commitment: license.policy_commitment,
            expiry_height: license.expiry_height,
            remaining_uses: next_remaining,
            revocation_id: license.revocation_id,
            license_nonce: license.license_nonce,
        };

        let receipt: UsageReceipt = UsageReceipt {
            owner: license.owner,
            creator: license.creator,
            voice_commitment: license.voice_commitment,
            purpose: license.purpose,
            content_commitment,
            policy_commitment: license.policy_commitment,
            used_at_height: claimed_height,
            license_nonce: license.license_nonce,
            use_index: next_remaining,
        };

        let execution_height: u32 = claimed_height;
        return (
            next_license,
            receipt,
            final {
                assert(std::ctx::block_height() >= execution_height);
                assert(std::ctx::block_height() <= execution_height + MAX_INCLUSION_DELAY);
                let is_revoked: bool = Mapping::get_or_use(revoked, revocation_id, false);
                assert(!is_revoked);
            }
        );
    }

    // Minimal public revocation. The mapping key is a random field stored
    // privately inside the license.
    fn revoke_license(identity: VoiceIdentity, license_nonce: field) -> (VoiceIdentity, Final) {
        assert_eq(identity.owner, std::ctx::signer());
        assert_neq(license_nonce, 0field);
        let revocation_id: field = BHP256::hash_to_field(
            RevocationSeed {
                voice_commitment: identity.voice_commitment,
                license_nonce,
            }
        );

        return (
            identity,
            final {
                Mapping::set(revoked, revocation_id, true);
            }
        );
    }

    // Consumes a private receipt and publishes only a one-way commitment.
    // None of the receipt's private fields are written to public state.
    fn publish_receipt(receipt: UsageReceipt) -> (field, Final) {
        assert_eq(receipt.owner, std::ctx::signer());
        let receipt_commitment: field = BHP256::hash_to_field(
            ReceiptCommitmentSeed {
                creator: receipt.creator,
                voice_commitment: receipt.voice_commitment,
                purpose: receipt.purpose,
                content_commitment: receipt.content_commitment,
                policy_commitment: receipt.policy_commitment,
                used_at_height: receipt.used_at_height,
                license_nonce: receipt.license_nonce,
                use_index: receipt.use_index,
            }
        );
        assert_neq(receipt_commitment, 0field);

        return (
            receipt_commitment,
            final {
                Mapping::set(public_receipts, receipt_commitment, true);
            }
        );
    }

    @noupgrade
    constructor() {}
}
