-- The 14 statements seeded in 0015 were shortened summaries of each
-- article; the Beliefs page should show the Church of God's actual,
-- official wording verbatim, not a paraphrase. Already applied directly
-- to the live database via the Data API (a data update, not a schema
-- change, needs no management-API access) — this records the same
-- change for the migration history / a future fresh seed.
update public.doctrine_statements set statement = 'In the verbal inspiration of the Bible.' where ordinal = 1;
update public.doctrine_statements set statement = 'In one God eternally existing in three persons; namely, the Father, Son, and Holy Ghost.' where ordinal = 2;
update public.doctrine_statements set statement = 'That Jesus Christ is the only begotten Son of the Father, conceived of the Holy Ghost, and born of the Virgin Mary. That Jesus was crucified, buried, and raised from the dead. That He ascended to heaven and is today at the right hand of the Father as the Intercessor.' where ordinal = 3;
update public.doctrine_statements set statement = 'That all have sinned and come short of the glory of God and that repentance is commanded of God for all and necessary for forgiveness of sins.' where ordinal = 4;
update public.doctrine_statements set statement = 'That justification, regeneration, and the new birth are wrought by faith in the blood of Jesus Christ.' where ordinal = 5;
update public.doctrine_statements set statement = 'In sanctification subsequent to the new birth, through faith in the blood of Christ; through the Word, and by the Holy Ghost.' where ordinal = 6;
update public.doctrine_statements set statement = 'Holiness to be God''s standard of living for His people.' where ordinal = 7;
update public.doctrine_statements set statement = 'In the baptism with the Holy Ghost subsequent to a clean heart.' where ordinal = 8;
update public.doctrine_statements set statement = 'In speaking with other tongues as the Spirit gives utterance and that it is the initial evidence of the baptism in the Holy Ghost.' where ordinal = 9;
update public.doctrine_statements set statement = 'In water baptism by immersion, and all who repent should be baptized in the name of the Father, and of the Son, and of the Holy Ghost.' where ordinal = 10;
update public.doctrine_statements set statement = 'Divine healing is provided for all in the atonement.' where ordinal = 11;
update public.doctrine_statements set statement = 'In the Lord''s Supper and washing of the saints'' feet.' where ordinal = 12;
update public.doctrine_statements set statement = 'In the premillennial second coming of Jesus. First, to resurrect the righteous dead and to catch away the living saints to Him in the air. Second, to reign on the earth a thousand years.' where ordinal = 13;
update public.doctrine_statements set statement = 'In the bodily resurrection; eternal life for the righteous, and eternal punishment for the wicked.' where ordinal = 14;
