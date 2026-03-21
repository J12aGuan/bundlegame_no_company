"""Firestore adapter for analytics pipeline."""

from __future__ import annotations

from typing import Any

from analytics.types import ScenarioBundle, SourcePayload


def load_from_firestore(dataset_root: str) -> SourcePayload:
    """
    Load participants and scenario bundle from Firestore.

    Requires optional dependency:
      pip install '.[firestore]'

    Environment:
      GOOGLE_APPLICATION_CREDENTIALS must point to a service-account file.
    """
    try:
        from google.cloud import firestore  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Firestore adapter requires google-cloud-firestore. Install with: pip install '.[firestore]'"
        ) from exc

    client = firestore.Client()

    participants: list[dict[str, Any]] = []
    users = list(client.collection("Users").stream())

    for user_doc in users:
        user = user_doc.to_dict() or {}
        user_id = user_doc.id

        actions = [
            {"id": doc.id, **(doc.to_dict() or {})}
            for doc in client.collection("Users").document(user_id).collection("Actions").stream()
        ]
        orders = [
            {"id": doc.id, **(doc.to_dict() or {})}
            for doc in client.collection("Users").document(user_id).collection("Orders").stream()
        ]
        summary_docs = [
            {"id": doc.id, **(doc.to_dict() or {})}
            for doc in client.collection("Users").document(user_id).collection("Summary").stream()
        ]
        scenario_set_docs = [
            {"id": doc.id, **(doc.to_dict() or {})}
            for doc in client.collection("Users").document(user_id).collection("ScenarioSet").stream()
        ]
        action_docs = [
            {"id": doc.id, **(doc.to_dict() or {})}
            for doc in client.collection("Users").document(user_id).collection("Action").stream()
        ]
        summary_doc = next((entry for entry in summary_docs if entry.get("id") == "summary"), None)
        scenario_progress_doc = next((entry for entry in scenario_set_docs if entry.get("id") == "progress"), None)
        action_summary_doc = next((entry for entry in action_docs if entry.get("id") == "actions"), None)

        participants.append(
            {
                "id": user_id,
                **user,
                "actions": actions,
                "orders": orders,
                "progressSummary": summary_doc,
                "summaryDoc": summary_doc,
                "scenarioSetProgressDoc": scenario_progress_doc,
                "scenarioActionsDoc": action_summary_doc,
            }
        )

    datasets_doc = client.collection("MasterData").document("datasets").get()
    datasets_data = datasets_doc.to_dict() if datasets_doc.exists else {}
    datasets_map = (datasets_data or {}).get("datasets", {}) if isinstance(datasets_data, dict) else {}
    entry = datasets_map.get(dataset_root, {})

    bundle = ScenarioBundle(
        scenarios=list(entry.get("scenarios", [])),
        orders=list(entry.get("orders", [])),
        optimal=list(entry.get("optimal", [])),
        metadata=dict(entry.get("metadata", {})),
    )

    return SourcePayload(participants=participants, scenario_bundle=bundle)
