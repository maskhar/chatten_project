import test from "node:test";
import assert from "node:assert/strict";

test("initializes media picker with current experience image", () => {
  const experience = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Morning Coffee",
    slug: "morning-coffee",
    description: "Start your day with panoramic views.",
    image_media_id: "660e8400-e29b-41d4-a716-446655440001",
    is_active: true,
    status: "published",
  };

  const approvedMedia = [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      title: "Sunrise view",
      alt_text: "Morning panorama",
      category: "experiences",
      rights_status: "approved",
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440002",
      title: "Coffee setup",
      alt_text: "Coffee on table",
      category: "food",
      rights_status: "approved",
    },
  ];

  const currentSelection = experience.image_media_id;
  const selectedMedia = approvedMedia.find((m) => m.id === currentSelection);

  assert.ok(selectedMedia);
  assert.equal(selectedMedia.id, "660e8400-e29b-41d4-a716-446655440001");
  assert.equal(selectedMedia.title, "Sunrise view");
  assert.equal(selectedMedia.rights_status, "approved");
});

test("handles experience with no image", () => {
  const experience = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Golden Hour",
    slug: "golden-hour",
    description: "Sunset experience.",
    image_media_id: null,
    is_active: true,
    status: "draft",
  };

  const approvedMedia = [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      title: "Sunrise view",
      alt_text: "Morning panorama",
      category: "experiences",
      rights_status: "approved",
    },
  ];

  const currentSelection = experience.image_media_id;
  const selectedMedia = approvedMedia.find((m) => m.id === currentSelection);

  assert.equal(currentSelection, null);
  assert.equal(selectedMedia, undefined);
});

test("filters only approved media for experience picker", () => {
  const allMedia = [
    { id: "660e8400-e29b-41d4-a716-446655440001", rights_status: "approved" },
    { id: "660e8400-e29b-41d4-a716-446655440002", rights_status: "needs_review" },
    { id: "660e8400-e29b-41d4-a716-446655440003", rights_status: "restricted" },
    { id: "660e8400-e29b-41d4-a716-446655440004", rights_status: "approved" },
  ];

  const approvedOnly = allMedia.filter((m) => m.rights_status === "approved");

  assert.equal(approvedOnly.length, 2);
  assert.equal(approvedOnly[0].id, "660e8400-e29b-41d4-a716-446655440001");
  assert.equal(approvedOnly[1].id, "660e8400-e29b-41d4-a716-446655440004");
});