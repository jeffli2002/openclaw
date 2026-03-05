# -*- coding: utf-8 -*-
"""
腾讯云函数自动创建脚本
用于创建微信公众号 API 代理云函数
"""

import json
import os
import sys
from tencentcloud.common import credential
from tencentcloud.scf.v20180416 import scf_client, models

def create_wechat_proxy_function(secret_id, secret_key, region='ap-guangzhou'):
    """创建微信 API 代理云函数"""
    
    # 初始化凭据
    cred = credential.Credential(secret_id, secret_key)
    client = scf_client.ScfClient(cred, region)
    
    # 云函数配置
    function_name = 'wechat_api_proxy'
    handler = 'index.main_handler'
    runtime = 'Python3.9'
    description = '微信公众号 API 代理函数 - 由 OpenClaw 自动创建'
    
    # 代理函数代码
    code = '''# -*- coding: utf-8 -*-
import json
import requests

def main_handler(event, context):
    """微信 API 代理函数"""
    
    # 微信 API 基础地址
    wechat_api_base = 'https://api.weixin.qq.com'
    
    # 获取请求路径
    path = event.get('path', '/cgi-bin/token')
    if path.startswith('/'):
        path = path
    
    # 构建完整 URL
    url = wechat_api_base + path
    
    # 获取查询参数
    query_string = event.get('queryString', {})
    if isinstance(query_string, dict):
        query_string = query_string
    
    # 获取请求方法
    method = event.get('httpMethod', 'GET')
    
    # 获取请求体
    body = event.get('body', '{}')
    if body and isinstance(body, str):
        try:
            body = json.loads(body)
        except:
            pass
    
    # 设置超时
    timeout = 30
    
    try:
        # 发起请求
        if method == 'GET':
            response = requests.get(url, params=query_string, timeout=timeout)
        elif method == 'POST':
            headers = {'Content-Type': 'application/json'}
            response = requests.post(url, json=body, headers=headers, timeout=timeout)
        else:
            response = requests.request(method, url, params=query_string, json=body, timeout=timeout)
        
        # 返回结果
        return {
            'isBase64Encoded': False,
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': response.text
        }
    except Exception as e:
        return {
            'isBase64Encoded': False,
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
'''
    
    # 创建云函数请求
    req = models.CreateFunctionRequest()
    req.FunctionName = function_name
    req.Handler = handler
    req.Runtime = runtime
    req.Description = description
    req.Code = {"ZipFile": code.encode('utf-8').hex()}
    req.MemorySize = 128
    req.Timeout = 30
    
    print(f"正在创建云函数: {function_name} ...")
    
    try:
        # 创建函数
        resp = client.CreateFunction(req)
        print(f"✓ 云函数创建成功! RequestId: {resp.RequestId}")
        
        # 等待函数创建完成
        import time
        time.sleep(3)
        
        # 创建 HTTP 触发器
        print("正在创建 HTTP 触发器...")
        trigger_req = models.CreateTriggerRequest()
        trigger_req.FunctionName = function_name
        trigger_req.TriggerName = f"{function_name}_http"
        trigger_req.TriggerType = "http"
        trigger_req.TriggerDesc = json.dumps({"authType": "None", "param": {}})
        
        try:
            trigger_resp = client.CreateTrigger(trigger_req)
            print(f"✓ HTTP 触发器创建成功!")
        except Exception as e:
            # 触发器可能已存在，获取现有的
            print(f"触发器可能已存在，尝试获取现有触发器...")
        
        # 获取触发器列表
        list_req = models.ListTriggersRequest()
        list_req.FunctionName = function_name
        
        trigger_list_resp = client.ListTriggers(list_req)
        
        # 查找 HTTP 触发器
        http_trigger_url = None
        for trigger in trigger_list_resp.Triggers:
            if trigger.TriggerType == "http":
                # 从触发器名称提取 URL
                # 格式: service-xxx-xxxgz.apigw.tencent.com/release/wechat_api_proxy
                http_trigger_url = f"https://{trigger.TriggerName}.apigw.tencent.com/release/{function_name}"
                break
        
        if not http_trigger_url:
            # 尝试从另一个API获取
            print("\n请到腾讯云控制台查看触发器地址:")
            print(f"https://console.cloud.tencent.com/scf/list?rid=1&ns=default")
        else:
            print(f"\n{'='*50}")
            print(f"✓ 云函数创建成功!")
            print(f"{'='*50}")
            print(f"\n您的 Proxy URL:")
            print(f"{http_trigger_url}")
            print(f"\n请将此 URL 配置到 Content Factory 的 .env 文件中:")
            print(f"WECHAT_API_PROXY_URL={http_trigger_url}")
        
        return http_trigger_url
        
    except Exception as e:
        error_msg = str(e)
        if "ResourceAlreadyExists" in error_msg:
            print("云函数已存在，正在获取现有函数的触发器地址...")
            # 获取现有函数的触发器
            list_req = models.ListTriggersRequest()
            list_req.FunctionName = function_name
            
            trigger_list_resp = client.ListTriggers(list_req)
            
            for trigger in trigger_list_resp.Triggers:
                if trigger.TriggerType == "http":
                    http_trigger_url = f"https://{trigger.TriggerName}.apigw.tencent.com/release/{function_name}"
                    print(f"\n{'='*50}")
                    print(f"✓ 云函数已存在!")
                    print(f"{'='*50}")
                    print(f"\n您的 Proxy URL:")
                    print(f"{http_trigger_url}")
                    print(f"\n请将此 URL 配置到 Content Factory 的 .env 文件中:")
                    print(f"WECHAT_API_PROXY_URL={http_trigger_url}")
                    return http_trigger_url
            
            print("请到腾讯云控制台查看触发器地址")
            return None
        else:
            print(f"✗ 创建失败: {error_msg}")
            return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python create_scf.py <SecretId> <SecretKey> [region]")
        print("示例: python create_scf.py AKIDxxxxxx xxxxxxxxxxxxxx")
        sys.exit(1)
    
    secret_id = sys.argv[1]
    secret_key = sys.argv[2]
    region = sys.argv[3] if len(sys.argv) > 3 else 'ap-guangzhou'
    
    create_wechat_proxy_function(secret_id, secret_key, region)
