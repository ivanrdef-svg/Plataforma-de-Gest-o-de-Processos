import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import {
  createPopDraftProposal,
  startPopDraftReview,
  updateReviewedSection,
} from "@/lib/pop-draft-proposal-store";
import { present, proposalFixture } from "./support/fixtures";

isolatedTest(
  "human review deep-copies sections and provenance without modifying the proposal",
  import.meta.url,
  () => {
    const original = createPopDraftProposal({ kind: "proposto", proposal: proposalFixture() });
    const before = structuredClone(original.proposedSections);
    const started = startPopDraftReview(original.id);
    if (!started.ok) throw new Error(started.reason);
    const reviewed = present(started.proposal.reviewedSections);
    expect(reviewed).toEqual(before);
    expect(reviewed).not.toBe(original.proposedSections);
    expect(reviewed[0]?.provenance?.sourceElementIds).not.toBe(
      original.proposedSections[0]?.provenance?.sourceElementIds,
    );
    const result = updateReviewedSection(original.id, "section-fixture", {
      title: "Procedimento revisado",
      content: "Texto humano.",
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.proposal.reviewedSections?.[0]).toMatchObject({
      title: "Procedimento revisado",
      content: "Texto humano.",
      humanEdited: true,
    });
    present(reviewed[0]?.provenance).sourceElementIds.push("review-only");
    expect(result.proposal.proposedSections).toEqual(before);
  },
);
