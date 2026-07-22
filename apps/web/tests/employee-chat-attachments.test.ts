import assert from "node:assert/strict";
import test from "node:test";
import {
  canArchiveEmployeeChatChannel,
  formatEmployeeChatAttachmentSize,
  validateEmployeeChatAttachment,
} from "../src/lib/employee-chat-attachments";

test("chat attachments accept only supported private media within the size limit", () => {
  assert.equal(validateEmployeeChatAttachment({ type: "image/jpeg", size: 1 }), null);
  assert.equal(validateEmployeeChatAttachment({ type: "application/pdf", size: 4_000_000 }), null);
  assert.match(validateEmployeeChatAttachment({ type: "image/gif", size: 100 }) ?? "", /JPEG/);
  assert.match(validateEmployeeChatAttachment({ type: "image/png", size: 4_000_001 }) ?? "", /4 MB/);
  assert.match(validateEmployeeChatAttachment({ type: "image/png", size: 0 }) ?? "", /4 MB/);
});

test("channel deletion archives managed channels only", () => {
  assert.equal(canArchiveEmployeeChatChannel("public"), true);
  assert.equal(canArchiveEmployeeChatChannel("private"), true);
  assert.equal(canArchiveEmployeeChatChannel("direct"), false);
  assert.equal(canArchiveEmployeeChatChannel("group"), false);
});

test("chat attachment sizes use readable decimal units", () => {
  assert.equal(formatEmployeeChatAttachmentSize(2_500), "3 KB");
  assert.equal(formatEmployeeChatAttachmentSize(2_500_000), "2.5 MB");
});
