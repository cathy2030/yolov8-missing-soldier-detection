"""Server-side helper to run the Roboflow workflow on a single image.
Used for manual testing / on-demand checks. Live video uses runner/edge_runner.py."""
from ..config import get_settings

settings = get_settings()


def run_workflow_on_image(image_url: str) -> dict:
    """Run the parade workflow on one image URL and return the raw first result dict.
    Requires inference-sdk. Output keys depend on the workflow definition."""
    from inference_sdk import InferenceHTTPClient

    client = InferenceHTTPClient(
        api_url=settings.ROBOFLOW_API_URL,
        api_key=settings.ROBOFLOW_API_KEY,
    )
    result = client.run_workflow(
        workspace_name=settings.ROBOFLOW_WORKSPACE,
        workflow_id=settings.ROBOFLOW_WORKFLOW_ID,
        images={"image": image_url},
    )
    # run_workflow returns a list (one entry per input image)
    return result[0] if isinstance(result, list) and result else (result or {})


