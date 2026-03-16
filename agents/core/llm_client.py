#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LLM Client - LLM调用客户端
职责: 统一管理LLM调用
"""

import os
import json
from typing import Dict, Any, List, Optional

class LLMClient:
    """
    LLM Client - LLM调用客户端
    
    职责:
    - 管理多个LLM Provider
    - 处理fallback逻辑
    - 统一调用接口
    
    支持的Provider:
    - minimax-portal (MiniMax M2.5, M2.1)
    - kimi-coding (Kimi K2.5)
    - qwen-portal (Qwen Coder, Qwen Vision)
    """
    
    def __init__(self):
        self.providers = {}
        self._init_providers()
    
    def _init_providers(self):
        """初始化Provider"""
        # 这里应该从 openclaw.json 读取配置
        # 简化版使用环境变量或默认配置
        
        self.providers = {
            "minimax-portal": {
                "enabled": True,
                "models": ["MiniMax-M2.5", "MiniMax-M2.1"]
            },
            "kimi-coding": {
                "enabled": True,
                "models": ["k2p5"]
            },
            "qwen-portal": {
                "enabled": True,
                "models": ["coder-model", "vision-model"]
            }
        }
    
    def chat(self, messages: List[Dict], config: Dict[str, Any]) -> str:
        """
        调用LLM (同步)
        
        Args:
            messages: [{"role": "system", "content": "..."}, ...]
            config: {
                "primary": "minimax-portal/MiniMax-M2.5",
                "fallbacks": ["kimi-coding/k2p5"],
                "temperature": 0.7,
                "max_tokens": 8192
            }
        
        Returns:
            LLM响应文本
        """
        primary = config.get("primary", "minimax-portal/MiniMax-M2.5")
        fallbacks = config.get("fallbacks", [])
        
        # 尝试主模型
        try:
            return self._call_llm(primary, messages, config)
        except Exception as e:
            print(f"[LLM] 主模型 {primary} 失败: {e}")
            
            # 尝试fallback
            for fallback in fallbacks:
                try:
                    print(f"[LLM] 尝试fallback: {fallback}")
                    return self._call_llm(fallback, messages, config)
                except Exception as e2:
                    print(f"[LLM] Fallback {fallback} 失败: {e2}")
                    continue
            
            raise Exception("所有模型都调用失败")
    
    async def chat_async(self, messages: List[Dict], config: Dict[str, Any]) -> str:
        """异步调用LLM"""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.chat, messages, config)
    
    def _call_llm(self, model: str, messages: List[Dict], config: Dict[str, Any]) -> str:
        """
        调用具体的LLM
        
        注意: 实际实现应该通过OpenClaw的API或SDK调用
        这里只是一个接口定义
        """
        # 解析model string: "provider/model"
        if "/" in model:
            provider, model_name = model.split("/", 1)
        else:
            provider = "minimax-portal"
            model_name = model
        
        # 构建请求
        request = {
            "model": model_name,
            "messages": messages,
            "temperature": config.get("temperature", 0.7),
            "max_tokens": config.get("max_tokens", 8192)
        }
        
        print(f"[LLM] 调用模型: {provider}/{model_name}")
        
        # TODO: 实际调用OpenClaw的completions API
        # 这里应该调用 openclaw.completions.create(request)
        
        # 模拟返回
        return self._mock_response(model, messages)
    
    def _mock_response(self, model: str, messages: List[Dict]) -> str:
        """模拟响应 (用于测试)"""
        last_message = messages[-1]["content"] if messages else ""
        
        return f"""[模拟响应]

收到任务: {last_message[:50]}...

模型: {model}

这是LLM响应。在实际运行中，这里会返回真实的LLM生成内容。

---
由 LLMClient 生成"""
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """获取可用模型列表"""
        models = []
        
        for provider, config in self.providers.items():
            if not config["enabled"]:
                continue
            
            for model in config["models"]:
                models.append({
                    "provider": provider,
                    "model": model,
                    "full_id": f"{provider}/{model}"
                })
        
        return models
    
    def is_provider_enabled(self, provider: str) -> bool:
        """检查Provider是否启用"""
        return self.providers.get(provider, {}).get("enabled", False)
    
    def get_status(self) -> Dict[str, Any]:
        """获取客户端状态"""
        return {
            "providers": self.providers,
            "available_models": self.get_available_models()
        }
