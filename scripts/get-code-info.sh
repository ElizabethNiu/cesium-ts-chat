#!/bin/bash
# 代码生成信息获取脚本
# 用途：输出规范的 @author 与 @since 信息，供 AI 生成代码注释时使用
#
# @author ElizabethNiu / elizaniu18@gmail.com
# @since 2026-11-23 16:46:35

# 获取 git 配置的用户名与邮箱
USER_NAME=$(git config user.name 2>/dev/null || echo "unknown")
USER_EMAIL=$(git config user.email 2>/dev/null || echo "unknown")

# 获取当前时间戳（yyyy-MM-dd HH:mm:ss）
NOW=$(date '+%Y-%m-%d %H:%M:%S')

echo "作者信息：${USER_NAME} / ${USER_EMAIL}"
echo "生成时间：${NOW}"
echo ""
echo "请在代码注释中使用如下格式："
echo " * @author ${USER_NAME} / ${USER_EMAIL}"
echo " * @since ${NOW}"
