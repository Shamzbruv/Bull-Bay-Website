const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
function load(file) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(require, mod, mod.exports);
  return mod.exports;
}
const { scoreSubmission, checkFormShield, HONEYPOT_FIELD, TIMESTAMP_FIELD } = load('lib/spam.ts');

// Verbatim from the church's own Visitor Follow-up screen.
const REAL_SPAM = [
  { firstName:'Jackson', lastName:'Vonwiller', email:'gemma.marshall112@gmail.com', phone:'9614686610', interest:'Joining a ministry',
    message:"Hi, We run an Instagram service, where we can increase your followers both safely and effectively. We don't use bots – everything is done manually to attract real, targeted followers who care about your content. The result? Increased brand awareness, higher engagement, and ultimately, more customers. The price is just $60 (USD) per month. You can find out more information here: http://instagrow.business/ If you are interested just complete the form on the above page. If you are not interested, no problem, just ignore this email. Kind Regards, Jackson" },
  { firstName:'Hello http://bullbayntcog.org/fekal0911', lastName:'Webmaster Vance', email:'pirduhina96@gmail.com', phone:'7816698105', interest:'General question',
    message:'Hello http://bullbayntcog.org/fekal0911 Owner' },
  { firstName:'Joanna', lastName:'Riggs', email:'joannariggs3@gmail.com', phone:'913044881', interest:'General question',
    message:"Hi, I just visited bullbayntcog.org and wondered if you'd ever thought about having an engaging video to explain what you do? Our prices start from just $195 (USD). Let me know if you're interested in seeing samples of our previous work. Regards, Joanna" },
  { firstName:'Aman', lastName:'Katiyar', email:'aman@rocketdigitaltech.com', phone:'571548322', interest:'Becoming a member',
    message:"Hello http://bullbayntcog.org, I hope you're doing well. I came across your business online and thought you might be interested in improving your visibility and traffic on search engines. We specialize in helping businesses strengthen their online presence through effective SEO strategies. Once you share your target keywords and target market, I'll send a full proposal. Warm regards, Aman" },
  { firstName:'Abdul', lastName:'Mobsby', email:'domains@search-bullbayntcog.org', phone:'3798642311', interest:'General question',
    message:"Hey Register bullbayntcog.org in Google's Search Index so it can be displayed in online search results! Add bullbayntcog.org today: indexhelp.pro" },
];

// Messages the church must never lose.
const GENUINE = [
  { firstName:'Marcia', lastName:'Brown', email:'marcia.brown@gmail.com', phone:'8765551234', interest:'Planning a first visit',
    message:"Good day, my family and I are moving to Bull Bay next month and would love to visit on Sunday. What time does service start?" },
  { firstName:'Devon', lastName:'Campbell', email:'devon@yahoo.com', interest:'Becoming a member',
    message:"I have been attending for about six months now and I would like to become a member. Please let me know the next steps. Kind regards, Devon" },
  { firstName:'Sister', lastName:'Thompson', email:'sthompson@flowmail.com', interest:'Joining a ministry',
    message:"I would like to join the choir. I sang with my previous church for 12 years." },
  { firstName:'Andre', lastName:'Grant', email:'andre.grant@hotmail.com', interest:'Prayer request',
    message:"Please pray for my mother, she is in hospital." },
  { firstName:'Kemar', lastName:'Reid', email:'kemar@gmail.com', interest:'General question',
    message:"Hi, I saw the livestream on your website at bullbayntcog.org and wanted to ask if the sermon from last Sunday is posted anywhere? Thank you and God bless." },
  { firstName:'Paulette', lastName:'Service', email:'paulette@gmail.com', interest:'General question',
    message:"Do you offer transport services for elderly members who cannot drive to church?" },
];

test('every real spam submission is blocked', () => {
  for (const s of REAL_SPAM) {
    const result = scoreSubmission(s);
    assert.equal(result.verdict, 'spam', `${s.firstName} ${s.lastName} scored ${result.score}: ${result.reasons.join('; ')}`);
  }
});

test('genuine enquiries are never blocked', () => {
  for (const s of GENUINE) {
    const result = scoreSubmission(s);
    assert.notEqual(result.verdict, 'spam', `${s.firstName} ${s.lastName} scored ${result.score}: ${result.reasons.join('; ')}`);
  }
});

test('honeypot catches an automated fill, empty honeypot passes', () => {
  const trapped = new FormData();
  trapped.set(HONEYPOT_FIELD, 'http://spam.example');
  assert.equal(checkFormShield(trapped).blocked, true);

  const human = new FormData();
  human.set(HONEYPOT_FIELD, '');
  assert.equal(checkFormShield(human).blocked, false);
});

test('a form filled faster than a human can type is blocked, a missing stamp is not', () => {
  const instant = new FormData();
  instant.set(TIMESTAMP_FIELD, String(Date.now() - 200));
  assert.equal(checkFormShield(instant).blocked, true);

  const considered = new FormData();
  considered.set(TIMESTAMP_FIELD, String(Date.now() - 30_000));
  assert.equal(checkFormShield(considered).blocked, false);

  // Someone browsing with JavaScript disabled still gets through.
  assert.equal(checkFormShield(new FormData()).blocked, false);
});
