-- The pastor's personal number was printed in the footer of every letter and
-- certificate the church issues, and appeared on the public site. Enquiries
-- for Rev. Dr. Page go through the Executive Assistant, who manages his
-- diary, so the number is removed from the stored document templates here
-- and from lib/documents/pdf.tsx in the same change.
--
-- Written as a targeted replace rather than a rewrite of the whole design
-- object so that any wording, accent colour or banner an administrator has
-- since edited through Admin → Documents is preserved.
update public.document_templates
set design = jsonb_set(
      design,
      '{footer}',
      to_jsonb(replace(design->>'footer', '(876) 833-5566 / (876) 596-3890', '(876) 596-3890'))
    )
where design ? 'footer'
  and design->>'footer' like '%833-5566%';

-- Same treatment for any email template body that carried it.
update public.email_templates
set body = replace(body, '(876) 833-5566 / (876) 596-3890', '(876) 596-3890')
where body like '%833-5566%';

update public.email_templates
set body = replace(body, '(876) 833-5566', '(876) 596-3890')
where body like '%833-5566%';
