import test from 'node:test';
import assert from 'node:assert/strict';
import {validUUID,operationsFromSchema,apiRequest} from '../src/api.js';
test('UUID validator',()=>{assert.equal(validUUID('3fa85f64-5717-4562-b3fc-2c963f66afa6'),true);assert.equal(validUUID('invalid'),false)});
test('OpenAPI operations discovery',()=>{const ops=operationsFromSchema({paths:{'/health':{get:{summary:'Health'}},'/x':{post:{summary:'Post'}}}});assert.equal(ops.length,2);assert.equal(ops[1].method,'POST')});
test('API error handling',async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:false,status:422,text:async()=>JSON.stringify({detail:'Invalid UUID'})});try{await assert.rejects(()=>apiRequest('/x'),/HTTP 422: Invalid UUID/)}finally{globalThis.fetch=previous}});
