#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agent Keyword Router - 关键词自动路由系统
职责: 根据消息内容自动匹配并路由到对应Agent
"""

import re
import yaml
from typing import List, Dict, Optional, Tuple
from datetime import datetime

class AgentKeywordRouter:
    """
    Agent关键词路由器
    
    功能:
    - 解析消息中的关键词
    - 根据关键词匹配最合适的Agent
    - 返回匹配结果和路由建议
    """
    
    def __init__(self, config_path: str = "/root/.openclaw/workspace/config/agent_keyword_router.yaml"):
        self.config_path = config_path
        self.rules = []
        self.behavior = {}
        self.load_config()
    
    def load_config(self):
        """加载路由配置"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
                self.rules = config.get('rules', [])
                self.behavior = config.get('behavior', {})
        except Exception as e:
            print(f"加载配置失败: {e}")
            # 使用默认配置
            self.rules = self._default_rules()
    
    def _default_rules(self) -> List[Dict]:
        """默认路由规则"""
        return [
            {
                "agent": "content",
                "name": "Content Agent",
                "keywords": ["内容", "日报", "文章", "公众号", "写作"],
                "priority": 100
            },
            {
                "agent": "coding",
                "name": "Coding Agent",
                "keywords": ["代码", "编程", "开发", "Bug", "API"],
                "priority": 100
            },
            {
                "agent": "product",
                "name": "Product Agent",
                "keywords": ["产品", "PRD", "需求", "功能", "用户"],
                "priority": 100
            },
            {
                "agent": "growth",
                "name": "Growth Agent",
                "keywords": ["增长", "SEO", "营销", "推广", "转化"],
                "priority": 100
            },
            {
                "agent": "finance",
                "name": "Finance Agent",
                "keywords": ["财务", "成本", "定价", "收入", "ROI"],
                "priority": 100
            },
            {
                "agent": "chief",
                "name": "Chief Agent",
                "keywords": ["*"],
                "priority": 0
            }
        ]
    
    def extract_keywords(self, message: str) -> List[str]:
        """
        从消息中提取关键词
        
        Args:
            message: 用户消息
            
        Returns:
            提取的关键词列表
        """
        # 清理消息
        message = message.lower().strip()
        
        # 提取所有可能的关键词（中文分词简化版）
        keywords = []
        
        # 提取中文字符串（2-10个字符）
        chinese_pattern = re.compile(r'[\u4e00-\u9fff]{2,10}')
        keywords.extend(chinese_pattern.findall(message))
        
        # 提取英文单词
        english_pattern = re.compile(r'[a-zA-Z]+')
        keywords.extend(english_pattern.findall(message))
        
        # 提取技术术语（如API、SEO等）
        tech_pattern = re.compile(r'[A-Z]{2,}')
        keywords.extend(tech_pattern.findall(message.upper()))
        
        return list(set(keywords))  # 去重
    
    def match_agent(self, message: str) -> Tuple[Optional[Dict], float, List[str]]:
        """
        根据消息匹配最合适的Agent
        
        Args:
            message: 用户消息
            
        Returns:
            (匹配的Agent配置, 匹配分数, 匹配到的关键词列表)
        """
        keywords = self.extract_keywords(message)
        
        best_match = None
        best_score = 0
        matched_keywords = []
        
        for rule in self.rules:
            agent_keywords = rule.get('keywords', [])
            priority = rule.get('priority', 0)
            
            # 跳过通配符规则（最后处理）
            if '*' in agent_keywords:
                if best_match is None:
                    best_match = rule
                continue
            
            # 计算匹配
            matches = []
            for kw in keywords:
                for agent_kw in agent_keywords:
                    if kw in agent_kw or agent_kw in kw:
                        matches.append(kw)
            
            # 计算匹配分数
            if matches:
                # 分数 = 匹配关键词数 * 优先级权重
                score = len(matches) * (priority / 100)
                
                if score > best_score:
                    best_score = score
                    best_match = rule
                    matched_keywords = matches
        
        return best_match, best_score, matched_keywords
    
    def route_message(self, message: str, sender: str = "user") -> Dict:
        """
        路由消息到对应Agent
        
        Args:
            message: 用户消息
            sender: 发送者
            
        Returns:
            路由结果
        """
        agent, score, keywords = self.match_agent(message)
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "sender": sender,
            "message": message,
            "extracted_keywords": self.extract_keywords(message),
            "matched_agent": agent.get('agent') if agent else None,
            "agent_name": agent.get('name') if agent else None,
            "match_score": score,
            "matched_keywords": keywords,
            "action": "route_to_agent",
            "target_agent": agent.get('agent') if agent else "chief"
        }
        
        return result
    
    def format_route_result(self, result: Dict) -> str:
        """格式化路由结果为可读文本"""
        lines = [
            "🔀 Agent路由结果",
            "",
            f"📨 消息: {result['message'][:50]}...",
            f"🔍 提取关键词: {', '.join(result['extracted_keywords'][:10])}",
            f"🎯 匹配Agent: {result['agent_name']} ({result['target_agent']})",
            f"📊 匹配分数: {result['match_score']:.2f}",
            f"✅ 匹配关键词: {', '.join(result['matched_keywords']) if result['matched_keywords'] else '默认匹配'}"
        ]
        return "\n".join(lines)


def main():
    """测试路由功能"""
    router = AgentKeywordRouter()
    
    test_messages = [
        "帮我写一篇关于AI的公众号文章",
        "修复这个API的Bug",
        "设计一个用户增长策略",
        "计算一下这个产品的ROI",
        "帮我写个PRD文档",
        "随便聊聊"
    ]
    
    print("=" * 60)
    print("Agent关键词路由测试")
    print("=" * 60)
    
    for msg in test_messages:
        result = router.route_message(msg)
        print("\n" + router.format_route_result(result))
        print("-" * 60)


if __name__ == "__main__":
    main()
