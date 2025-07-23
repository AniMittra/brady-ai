# Qwen3 Model Integration Guide

## 🚀 New Qwen3 Models (July 2025)

### **Qwen3-235B-A22B-Instruct-2507**
- **Parameters**: 235B total, 22B active (MoE)
- **Context**: 256K tokens
- **Strengths**: Instruction following, reasoning, math, science, coding
- **Best for**: General tasks, complex reasoning, multilingual

### **Qwen3-Coder-480B-A35B-Instruct** ⭐
- **Parameters**: 480B total, 35B active (MoE)
- **Context**: 256K native, 1M with extrapolation
- **Strengths**: Agentic coding, workflows, debugging
- **Best for**: Brady's coding tasks, agentic workflows

## 📋 Integration Options

### 1. **Portkey Dashboard** (Recommended)
Update your existing Portkey configs:

**Director Config:**
```json
{
  "strategy": {
    "mode": "fallback"
  },
  "targets": [
    {
      "provider": "openrouter",
      "api_key": "{{OPENROUTER_API_KEY}}",
      "override_params": {
        "model": "qwen/qwen3-235b-a22b-instruct-2507",
        "max_tokens": 4000,
        "temperature": 0.7
      }
    }
  ]
}
```

**Coder Config:**
```json
{
  "strategy": {
    "mode": "fallback"
  },
  "targets": [
    {
      "provider": "openrouter", 
      "api_key": "{{OPENROUTER_API_KEY}}",
      "override_params": {
        "model": "qwen/qwen3-coder-480b-a35b-instruct",
        "max_tokens": 4000,
        "temperature": 0.3
      }
    }
  ]
}
```

### 2. **VS Code Continue Extension**

Add to your Continue config (`~/.continue/config.json`):

```json
{
  "models": [
    {
      "title": "Qwen3 Coder 480B",
      "provider": "openrouter",
      "model": "qwen/qwen3-coder-480b-a35b-instruct",
      "apiKey": "YOUR_OPENROUTER_KEY",
      "contextLength": 256000,
      "description": "Qwen3's most advanced coding model"
    },
    {
      "title": "Qwen3 235B General",
      "provider": "openrouter", 
      "model": "qwen/qwen3-235b-a22b-instruct-2507",
      "apiKey": "YOUR_OPENROUTER_KEY",
      "contextLength": 256000,
      "description": "Qwen3's flagship reasoning model"
    }
  ]
}
```

### 3. **Aider Configuration**

Add to your shell profile or run directly:

```bash
# For Qwen3 Coder (best for aider)
export AIDER_MODEL=openrouter/qwen/qwen3-coder-480b-a35b-instruct
export OPENROUTER_API_KEY=your_key_here

# Or use aider directly:
aider --model openrouter/qwen/qwen3-coder-480b-a35b-instruct

# For general tasks:
aider --model openrouter/qwen/qwen3-235b-a22b-instruct-2507
```

### 4. **Brady Model Priorities** (Optional Backup)

Add to `model-priorities.json`:

```json
{
  "roles": {
    "director": {
      "providers": [
        {
          "name": "openrouter",
          "models": ["qwen/qwen3-235b-a22b-instruct-2507"],
          "priority": 1
        }
      ]
    },
    "coder": {
      "providers": [
        {
          "name": "openrouter", 
          "models": ["qwen/qwen3-coder-480b-a35b-instruct"],
          "priority": 1
        }
      ]
    }
  }
}
```

## 💡 **Recommendations**

1. **For Brady**: Use Portkey configs with Qwen3-Coder-480B for coding tasks
2. **For Continue**: Add both models, use Coder for coding, 235B for general
3. **For Aider**: Definitely use Qwen3-Coder-480B (perfect match!)
4. **Cost**: Check OpenRouter pricing - these are large models

## 🔗 **Model Names to Use**
- `qwen/qwen3-235b-a22b-instruct-2507`
- `qwen/qwen3-coder-480b-a35b-instruct`

*Note: Verify exact model names on OpenRouter as they may vary slightly*