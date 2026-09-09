// @ts-check
'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test, expect } = require('./support/browserCoverage');
const ORIGIN = 'https://logout.fixture.test';
const BUNDLE_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.js';
const STYLE_URL = 'https://cdn.jsdelivr.net/gh/MarcoPoloResearchLab/mpr-ui@latest/mpr-ui.css';
const AUTH = { tauthUrl: ORIGIN, tenantId: 'logout-fixture', sessionPath: '/me', logoutPath: '/auth/logout', providers: { google: { enabled: true, clientId: 'fixture-client', loginPath: '/auth/google', noncePath: '/auth/nonce' }, apple: { enabled: false }, password: { enabled: false } } };
const HTML = `<!doctype html><html><head><link rel="stylesheet" href="${STYLE_URL}"></head><body><mpr-header id="header" brand-label="Logout fixture" auth-config='${JSON.stringify(AUTH)}'><mpr-user slot="aux" logout-url="#signed-out" logout-label="Sign out"></mpr-user></mpr-header><script src="${BUNDLE_URL}"></script></body></html>`;
const GOOGLE = `window.google={accounts:{id:{initialize(config){this.config=config;},renderButton(host,options){const button=document.createElement('button');button.textContent='Google';button.dataset.fixtureGoogle='true';button.onclick=()=>{options.click_listener();this.config.callback({credential:'fixture-credential',state:options.state});};host.replaceChildren(button);},disableAutoSelect(){},cancel(){},prompt(){}}}};`;
for (const width of [390,1280]) {
  test(`B067: header signs out without document navigation at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    let logoutRequests=0;
    let authenticated=false;
    await page.route(`${ORIGIN}/`,route=>route.fulfill({status:200,contentType:'text/html',body:HTML}));
    for(const [url,name,contentType] of [[BUNDLE_URL,'mpr-ui.js','application/javascript'],[STYLE_URL,'mpr-ui.css','text/css']]) {
      await page.route(url,route=>route.fulfill({status:200,contentType,body:readFileSync(join(__dirname,'../..',name))}));
    }
    await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({status:200,contentType:'application/javascript',body:GOOGLE}));
    await page.route(`${ORIGIN}/auth/*`,route=>{
      const pathname=new URL(route.request().url()).pathname;
      let status=200;
      let payload={};
      if(pathname==='/auth/nonce') payload={nonce:'fixture-nonce'};
      else if(pathname==='/auth/google'){authenticated=true;payload={user_id:'fixture-user',user_email:'fixture@example.test',display:'Fixture User'};}
      else if(pathname==='/auth/logout'){authenticated=false;logoutRequests+=1;status=204;}
      else status=401;
      return route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(payload)});
    });
    await page.route(`${ORIGIN}/me`,route=>route.fulfill({status:authenticated?200:401,contentType:'application/json',body:JSON.stringify({user_id:'fixture-user',user_email:'fixture@example.test',display:'Fixture User'})}));
    await page.goto(ORIGIN);
    await page.locator('[data-fixture-google]').click();
    await expect(page.locator('#header')).toHaveAttribute('data-mpr-auth-status','authenticated');
    await page.locator('[data-mpr-user="trigger"]').click();
    await page.locator('[data-mpr-user="logout"]').click();
    await expect(page).toHaveURL(`${ORIGIN}/#signed-out`);
    expect(logoutRequests).toBe(1);
    await expect(page.locator('#header')).toHaveAttribute('data-mpr-auth-status','unauthenticated');
    await expect(page.locator('[data-fixture-google]')).toBeVisible();
    await expect(page.locator('[data-mpr-user="trigger"]')).toBeHidden();
    await page.locator('[data-fixture-google]').click();
    await expect(page.locator('#header')).toHaveAttribute('data-mpr-auth-status','authenticated');
  });
}
