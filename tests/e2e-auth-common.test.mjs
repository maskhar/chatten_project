import test from "node:test";
import assert from "node:assert/strict";
import { createCredentials, parseRole, requireRemoteOptIn, validateState } from "../scripts/e2e-auth-common.mjs";
test("E2E roles validate",()=>{assert.equal(parseRole([]),"none");assert.equal(parseRole(["--role","editor"]),"editor");assert.throws(()=>parseRole(["--role","owner"]));});
test("remote safety opt-in required",()=>{assert.throws(()=>requireRemoteOptIn());assert.doesNotThrow(()=>requireRemoteOptIn("true"));});
test("credential state shape validates without exposing password",()=>{const credentials=createCredentials();assert.match(credentials.email,/^chatten-e2e-/);assert.ok(credentials.password.length>=32);assert.doesNotThrow(()=>validateState({userId:"79ae741c-2a71-44bb-a97d-59f35ad0e500",email:credentials.email,password:credentials.password,role:"none"}));});
test("cleanup state rejects broad identifiers",()=>assert.throws(()=>validateState({userId:"all",email:"x@example.invalid",password:"secret",role:"none"})));