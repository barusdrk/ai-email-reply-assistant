import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({
  find:vi.fn(),
  syncInbox:vi.fn(),
}));

vi.mock("../models/ConnectedAccount.js",()=>({
  default:{find:mocks.find},
}));

vi.mock("./email.js",()=>({
  syncInbox:mocks.syncInbox,
}));

import {syncConnectedInboxes} from "./automaticInboxSync.js";

describe("syncConnectedInboxes",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.find.mockReturnValue({
      select:()=>({
        lean:async()=>[
          {userId:"user-1",provider:"gmail"},
          {userId:"user-1",provider:"gmail"},
          {userId:"user-1",provider:"outlook"},
          {userId:"user-2",provider:"other"},
          {userId:null,provider:"gmail"},
        ],
      }),
    });
    mocks.syncInbox.mockResolvedValue({
      processedCount:1,
      failedCount:0,
    });
  });

  it("syncs each connected user/provider pair once",async()=>{
    const result=await syncConnectedInboxes();

    expect(mocks.find).toHaveBeenCalledWith({connected:true});
    expect(mocks.syncInbox).toHaveBeenCalledTimes(2);
    expect(mocks.syncInbox).toHaveBeenNthCalledWith(1,"gmail","user-1");
    expect(mocks.syncInbox).toHaveBeenNthCalledWith(2,"outlook","user-1");
    expect(result).toEqual({
      accounts:2,
      processed:2,
      failed:0,
      skipped:false,
    });
  });

  it("continues syncing other accounts when one provider fails",async()=>{
    mocks.syncInbox
      .mockRejectedValueOnce(new Error("Gmail unavailable"))
      .mockResolvedValueOnce({processedCount:2,failedCount:1});

    const result=await syncConnectedInboxes();

    expect(mocks.syncInbox).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      accounts:2,
      processed:2,
      failed:2,
      skipped:false,
    });
  });
});
