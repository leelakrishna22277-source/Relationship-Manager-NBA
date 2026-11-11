"""OpenTelemetry tracing of the main pipeline steps (prompt, time, cost).

Console exporter by default so traces are visible without extra infra; set
OTEL_EXPORTER=otlp + OTEL_ENDPOINT to forward to a Jaeger/collector instead.
"""
import logging
import time
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter, SpanExportResult

from .config import settings

logger = logging.getLogger("bnk10.ai.telemetry")


class LoggingSpanExporter(SpanExporter):
    """Span exporter that logs each finished span.

    Unlike ConsoleSpanExporter this is safe under pytest (no direct stdout
    writes from the exporter thread) and shows traces on the console by default.
    """

    def export(self, spans):
        for span in spans:
            attrs = dict(span.attributes or {})
            logger.info(
                "TRACE span=%s trace_id=%s duration=%sms attrs=%s",
                span.name,
                format(span.context.trace_id, "x")[:12] if span.context else "unknown",
                attrs.get("duration_ms", "?"),
                attrs,
            )
        return SpanExportResult.SUCCESS

    def shutdown(self):
        pass


_provider_configured = False


def setup_tracing() -> None:
    global _provider_configured
    if _provider_configured:
        return
    resource = Resource.create(
        {"service.name": "bnk10-ai-service", "service.version": "2.0.0"}
    )
    provider = TracerProvider(resource=resource)
    if settings.OTEL_EXPORTER.lower() == "otlp" and settings.OTEL_ENDPOINT:
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter  # type: ignore[import-not-found]

            provider.add_span_processor(
                BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.OTEL_ENDPOINT))
            )
        except ImportError:
            logger.warning("opentelemetry-exporter-otlp not installed; falling back to logging exporter")
            provider.add_span_processor(BatchSpanProcessor(LoggingSpanExporter()))
    else:
        provider.add_span_processor(BatchSpanProcessor(LoggingSpanExporter()))
    trace.set_tracer_provider(provider)
    _provider_configured = True


def get_tracer():
    setup_tracing()
    return trace.get_tracer("bnk10.ai.pipeline")


@contextmanager
def traced_span(name: str, attributes: dict | None = None):
    """Context manager that records duration + attributes for a pipeline step."""
    tracer = get_tracer()
    start = time.perf_counter()
    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, value in attributes.items():
                safe = str(value)[:500]
                span.set_attribute(key, safe)
        try:
            yield span
        except Exception as exc:  # record failure on the span, re-raise
            span.record_exception(exc)
            span.set_attribute("step.failed", True)
            raise
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000
            span.set_attribute("duration_ms", round(elapsed_ms, 2))
