-- Deeper branding fields on top of the existing logo_url/primary_color.
ALTER TABLE school_settings ADD COLUMN favicon_url TEXT;
ALTER TABLE school_settings ADD COLUMN school_seal_url TEXT;
ALTER TABLE school_settings ADD COLUMN report_card_watermark_url TEXT;
ALTER TABLE school_settings ADD COLUMN secondary_color TEXT;
ALTER TABLE school_settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';
ALTER TABLE school_settings ADD COLUMN font_family TEXT;
