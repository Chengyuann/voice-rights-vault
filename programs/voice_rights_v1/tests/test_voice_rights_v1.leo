import voice_rights_v1.aleo;

const VOICE_COMMITMENT: field = 101field;
const ISSUER_COMMITMENT: field = 202field;
const POLICY_ROOT: field = 303field;
const POLICY_COMMITMENT: field = 404field;
const LICENSE_NONCE: field = 606field;
const GAME_NPC: u8 = 1u8;
const LICENSEE: address = aleo1txgqtngdpak0grxl359gt52ng73axuhm0kjsvdsz4mf55dh8rcrsrl7p33;

program test_voice_rights_v1.aleo {
    @noupgrade
    constructor() {}

    @test
    fn register_voice_ok() {
        let signer: address = std::ctx::signer();
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );

        assert_eq(identity.owner, signer);
        assert_eq(identity.voice_commitment, VOICE_COMMITMENT);
        assert_eq(identity.issuer_commitment, ISSUER_COMMITMENT);
        assert_eq(identity.policy_root, POLICY_ROOT);
        assert_eq(identity.identity_version, 1u32);
        assert_eq(identity.issued_licenses, 0u32);
    }

    @test
    @should_fail
    fn register_empty_voice() {
        voice_rights_v1.aleo::register_voice(0field, ISSUER_COMMITMENT, POLICY_ROOT);
    }

    @test
    @should_fail
    fn register_empty_issuer() {
        voice_rights_v1.aleo::register_voice(VOICE_COMMITMENT, 0field, POLICY_ROOT);
    }

    @test
    @should_fail
    fn register_empty_policy() {
        voice_rights_v1.aleo::register_voice(VOICE_COMMITMENT, ISSUER_COMMITMENT, 0field);
    }

    @test
    fn issue_license_ok() {
        let signer: address = std::ctx::signer();
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );

        let (updated_identity, license): (voice_rights_v1.aleo::VoiceIdentity, voice_rights_v1.aleo::VoiceLicense) =
            voice_rights_v1.aleo::issue_license(
                identity,
                LICENSEE,
                GAME_NPC,
                POLICY_COMMITMENT,
                1000u32,
                3u32,
                LICENSE_NONCE,
            );

        assert_eq(updated_identity.owner, signer);
        assert_eq(updated_identity.identity_version, 2u32);
        assert_eq(updated_identity.issued_licenses, 1u32);
        assert_eq(license.creator, signer);
        assert_eq(license.owner, LICENSEE);
        assert_eq(license.voice_commitment, VOICE_COMMITMENT);
        assert_eq(license.purpose, GAME_NPC);
        assert_eq(license.policy_commitment, POLICY_COMMITMENT);
        assert_eq(license.expiry_height, 1000u32);
        assert_eq(license.remaining_uses, 3u32);
        assert_neq(license.revocation_id, 0field);
        assert_eq(license.license_nonce, LICENSE_NONCE);
    }

    @test
    @should_fail
    fn issue_zero_purpose() {
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );
        voice_rights_v1.aleo::issue_license(
            identity, LICENSEE, 0u8, POLICY_COMMITMENT, 1000u32, 3u32, LICENSE_NONCE,
        );
    }

    @test
    @should_fail
    fn issue_empty_policy() {
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );
        voice_rights_v1.aleo::issue_license(
            identity, LICENSEE, GAME_NPC, 0field, 1000u32, 3u32, LICENSE_NONCE,
        );
    }

    @test
    @should_fail
    fn issue_zero_expiry() {
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );
        voice_rights_v1.aleo::issue_license(
            identity, LICENSEE, GAME_NPC, POLICY_COMMITMENT, 0u32, 3u32, LICENSE_NONCE,
        );
    }

    @test
    @should_fail
    fn issue_zero_uses() {
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );
        voice_rights_v1.aleo::issue_license(
            identity, LICENSEE, GAME_NPC, POLICY_COMMITMENT, 1000u32, 0u32, LICENSE_NONCE,
        );
    }

    @test
    @should_fail
    fn issue_empty_nonce() {
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );
        voice_rights_v1.aleo::issue_license(
            identity, LICENSEE, GAME_NPC, POLICY_COMMITMENT, 1000u32, 3u32, 0field,
        );
    }

    @test
    fn revoke_executes() -> Final {
        let identity: voice_rights_v1.aleo::VoiceIdentity = voice_rights_v1.aleo::register_voice(
            VOICE_COMMITMENT,
            ISSUER_COMMITMENT,
            POLICY_ROOT,
        );
        let (identity_again, fin): (voice_rights_v1.aleo::VoiceIdentity, Final) =
            voice_rights_v1.aleo::revoke_license(identity, LICENSE_NONCE);
        assert_eq(identity_again.voice_commitment, VOICE_COMMITMENT);
        return final {
            fin.run();
        };
    }

}
