import { isolatedTest } from "./support/isolated-test";
import { expect } from "bun:test";
import {
  createPopDraftProposal,
  startPopDraftReview,
  updateReviewedSection,
  confirmPopDraftProposal,
} from "@/lib/pop-draft-proposal-store";
import { getPopDoc } from "@/lib/pop-store";
import { present, proposalFixture } from "./support/fixtures";

isolatedTest(
  "confirmation materializes reviewed content and provenance without AI-only fields",
  import.meta.url,
  () => {
    const proposal = createPopDraftProposal({ kind: "proposto", proposal: proposalFixture() });
    expect(startPopDraftReview(proposal.id).ok).toBe(true);
    expect(
      updateReviewedSection(proposal.id, "section-fixture", {
        title: "Texto confirmado",
        content: "Revisado pelo humano.",
      }).ok,
    ).toBe(true);
    const result = confirmPopDraftProposal(proposal.id, { name: "POP revisado" });
    if (!result.ok) throw new Error(result.reason);
    const pop = present(getPopDoc(present(result.proposal.confirmedPopId)));
    expect(pop.status).toBe("rascunho");
    expect(pop.name).toBe("POP revisado");
    expect(pop.sections).toHaveLength(1);
    expect(pop.sections[0]).toMatchObject({
      title: "Texto confirmado",
      content: "Revisado pelo humano.",
      origin: "documento",
      provenance: { sourceDocumentId: "source-fixture", sourceElementIds: ["element-001"] },
    });
    expect(pop.importOrigin).toMatchObject({
      sourceDocumentId: proposal.sourceDocumentId,
      draftProposalId: proposal.id,
    });
    for (const object of [pop, ...pop.sections]) {
      for (const field of [
        "confidence",
        "findings",
        "aiMeta",
        "humanEdited",
        "proposedSections",
        "reviewedSections",
      ]) {
        expect(object).not.toHaveProperty(field);
      }
    }
    expect(pop.sections[0]?.provenance).not.toBe(result.proposal.reviewedSections?.[0]?.provenance);
    expect(result.proposal.proposedSections[0]?.content).toBe("Texto original da proposta.");
  },
);
