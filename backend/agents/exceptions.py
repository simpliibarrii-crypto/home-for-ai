"""
Home for AI — Agent Exception Hierarchy

Custom exception classes for agent-related errors throughout the system.
"""


class AgentError(Exception):
    """Base exception for all agent-related errors."""


class AgentInitializationError(AgentError):
    """Raised when an agent cannot be initialized or constructed."""


class AgentStateError(AgentError):
    """Raised on invalid state transitions."""


class AgentConfigurationError(AgentError):
    """Raised when agent configuration is invalid or missing."""


class AgentRuntimeError(AgentError):
    """Raised during agent execution or decision loop failures."""


class AgentMemoryError(AgentError):
    """Raised when agent memory operations fail."""


class ToolError(AgentError):
    """Base exception for tool execution errors."""


class ToolNotFoundError(ToolError):
    """Raised when a requested tool is not registered."""


class ToolExecutionError(ToolError):
    """Raised when a tool call fails during execution."""


class ToolTimeoutError(ToolError):
    """Raised when a tool call exceeds its timeout."""


class LLMError(AgentError):
    """Base exception for LLM-related failures."""


class LLMUnavailableError(LLMError):
    """Raised when the LLM API is unreachable or returns an unrecoverable error."""


class LLMTimeoutError(LLMError):
    """Raised when an LLM call exceeds its timeout threshold."""


class LLMRateLimitError(LLMError):
    """Raised when the LLM API rate limit is exceeded."""


class LLMResponseError(LLMError):
    """Raised when the LLM returns an invalid or unparseable response."""


class SkillError(AgentError):
    """Base exception for skill engine errors."""


class SkillGenerationError(SkillError):
    """Raised when skill generation (LLM or rule-based) fails."""


class SkillLimitError(SkillError):
    """Raised when the agent has reached its maximum skill capacity."""
