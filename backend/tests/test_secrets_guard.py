"""Secrets must never leak through error messages (the AI-chat 404 case)."""
from app.core.secrets_guard import scrub_secrets
from app.services.llm.provider import clean_model_name


def test_scrub_gemini_key_in_url():
    err = ("Client error '404 Not Found' for url "
           "'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6L8secretkey123'")
    out = scrub_secrets(err)
    assert "secretkey123" not in out
    assert "key=***" in out
    assert "gemini-2.5-flash" in out  # model name is not secret, keep it


def test_scrub_firms_key_in_path():
    err = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/3ceb6a3e532d5d3be77ff23d71da4f1e/VIIRS_SNPP_NRT/1"
    out = scrub_secrets(err)
    assert "3ceb6a3e532d5d3be77ff23d71da4f1e" not in out
    assert "/csv/***/" in out


def test_scrub_private_key_block():
    err = 'key "-----BEGIN PRIVATE KEY-----\nMIIESECRET\n-----END PRIVATE KEY-----" failed'
    out = scrub_secrets(err)
    assert "MIIESECRET" not in out


def test_clean_model_name():
    assert clean_model_name("gemini-2.5-flash", "d") == "gemini-2.5-flash"
    assert clean_model_name("  gemini-2.5-flash  ", "d") == "gemini-2.5-flash"
    assert clean_model_name("models/gemini-2.5-flash", "d") == "gemini-2.5-flash"
    assert clean_model_name("gemini,2.5-flash", "d") == "d"
    assert clean_model_name("", "d") == "d"
    assert clean_model_name(None, "d") == "d"
