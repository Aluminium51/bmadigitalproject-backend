import { expect, test } from "bun:test";
import { getIntegrationContext } from "../setup/integration";
import { createTestUser } from "../fixtures/users.fixture";
import { createTestMeeting } from "../fixtures/meetings.fixture";
import { cleanupTestRecords } from "../helpers/cleanup.helper";
import { requestJson } from "../helpers/api.helper";

test("a Secretary can manage meetings while a normal user cannot", async () => {
  const context = await getIntegrationContext();
  const records: { userIds: string[]; meetingIds: string[] } = { userIds: [], meetingIds: [] };
  const secretary = await createTestUser(context.db, { roles: ["secretary"], usernamePrefix: "meeting-secretary" });
  const user = await createTestUser(context.db, { usernamePrefix: "meeting-normal" });
  records.userIds.push(secretary.user.userId, user.user.userId);

  try {
    const created = await requestJson(context.app, "/api/v1/meetings", {
      method: "POST",
      user: secretary.context,
      body: {
        meetingNo: `API-${Date.now()}`,
        title: "Secretary meeting",
        meetingTypeId: 1,
        meetingDate: "2027-01-01T00:00:00.000Z",
        location: "Meeting room",
        meetingStatusId: 1,
      },
    });
    expect(created.response.status).toBe(201);
    const meetingId = (created.data as any)?.data?.id;
    expect(meetingId).toBeString();
    records.meetingIds.push(meetingId);

    const normalUserAttempt = await requestJson(context.app, "/api/v1/meetings/", {
      method: "POST",
      user: user.context,
      body: {
        meetingNo: `NORMAL-${Date.now()}`,
        title: "Unauthorized meeting",
        meetingTypeId: 1,
        meetingDate: "2027-01-01T00:00:00.000Z",
        meetingStatusId: 1,
      },
    });
    expect(normalUserAttempt.response.status).toBe(403);

    // The fixture is also used to ensure deterministic cleanup handles rows
    // created through the database connection rather than the HTTP route.
    const fixtureMeeting = await createTestMeeting(context.db, secretary.user.userId);
    records.meetingIds.push(fixtureMeeting.id);
  } finally {
    await cleanupTestRecords(context.db, records);
  }
});
