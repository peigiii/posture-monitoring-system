# GitHub Submission Guide / GitHub 提交指南

## 🎯 目标 / Goal

将 `final_submission` 文件夹提交到 GitHub，供讲师审阅。

---

## 方法一：自动化脚本（推荐）/ Method 1: Automated Script (Recommended)

### Windows PowerShell 脚本

我已经为你创建了自动化脚本 `submit_to_github.ps1`，它会：
1. 初始化 Git 仓库
2. 添加所有文件
3. 创建提交
4. 推送到 GitHub

### 使用步骤：

#### 1. 在 GitHub 上创建新仓库
1. 访问 https://github.com/new
2. 仓库名称：`posture-monitoring-system`
3. 描述：`Real-Time Vision-Based Posture Monitoring System for SCI Patients`
4. 选择：**Public**（公开，讲师可以查看）
5. **不要**勾选 "Add a README file"
6. 点击 "Create repository"
7. **复制仓库 URL**（例如：`https://github.com/你的用户名/posture-monitoring-system.git`）

#### 2. 运行自动化脚本
```powershell
cd "D:\projects\cv_grp2_posture_monitoring-main\posture monitoring\final_submission"

# 运行脚本
.\submit_to_github.ps1
```

#### 3. 按提示输入信息
- GitHub 仓库 URL
- 你的 GitHub 用户名
- 你的邮箱

脚本会自动完成所有操作！

---

## 方法二：手动步骤 / Method 2: Manual Steps

### 步骤 1：在 GitHub 创建仓库

1. 登录 GitHub: https://github.com
2. 点击右上角 "+" → "New repository"
3. 填写信息：
   - **Repository name**: `posture-monitoring-system`
   - **Description**: `Real-Time Vision-Based Posture Monitoring System for SCI Patients`
   - **Public** ✅（讲师可以查看）
   - **不要**勾选 "Add a README file"
4. 点击 "Create repository"

### 步骤 2：初始化本地仓库

打开 PowerShell，执行：

```powershell
# 进入 final_submission 文件夹
cd "D:\projects\cv_grp2_posture_monitoring-main\posture monitoring\final_submission"

# 初始化 Git 仓库
git init

# 配置用户信息（替换为你的信息）
git config user.name "你的名字"
git config user.email "你的邮箱@example.com"

# 添加所有文件
git add .

# 创建提交
git commit -m "Initial commit: Real-Time Posture Monitoring System

- Phase 1: Offline validation tool with dataset evaluation
- Phase 2: Real-time web application with MediaPipe Pose
- SCI patient optimized thresholds (Standard, Relaxed, Strict)
- Comprehensive documentation in English
- 96.88% accuracy on validation dataset"
```

### 步骤 3：连接到 GitHub 并推送

```powershell
# 添加远程仓库（替换为你的 GitHub 仓库 URL）
git remote add origin https://github.com/你的用户名/posture-monitoring-system.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步骤 4：验证

访问你的 GitHub 仓库，确认：
- ✅ 所有文件都已上传
- ✅ README.md 正确显示
- ✅ 文件夹结构完整

---

## 🔧 常见问题 / Troubleshooting

### 问题 1：Git 未安装

**错误信息**: `'git' is not recognized as an internal or external command`

**解决方案**:
1. 下载 Git: https://git-scm.com/download/win
2. 安装时选择 "Git from the command line and also from 3rd-party software"
3. 重启 PowerShell

### 问题 2：身份验证失败

**错误信息**: `Authentication failed`

**解决方案**:
使用 Personal Access Token (PAT) 代替密码：

1. 访问 GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 选择权限：`repo` (全选)
4. 生成并复制 token
5. 推送时使用 token 作为密码

### 问题 3：文件太大

**错误信息**: `file size exceeds GitHub's file size limit`

**解决方案**:
检查是否有大文件（如数据集图片）：
```powershell
# 查找大于 50MB 的文件
Get-ChildItem -Recurse | Where-Object {$_.Length -gt 50MB} | Select-Object FullName, Length
```

如果有，创建 `.gitignore` 文件排除它们。

### 问题 4：已存在 Git 仓库

**错误信息**: `Reinitialized existing Git repository`

**解决方案**:
```powershell
# 删除现有 Git 配置
Remove-Item -Recurse -Force .git

# 重新初始化
git init
```

---

## 📋 提交后检查清单 / Post-Submission Checklist

访问你的 GitHub 仓库，确认：

- [ ] README.md 在首页正确显示
- [ ] 文件夹结构完整：
  - [ ] `phase1_validation_tool/`
  - [ ] `phase2_web_application/`
  - [ ] `README.md`
  - [ ] `SUBMISSION_CHECKLIST.md`
- [ ] 所有文件都可以在线查看
- [ ] 代码高亮正确显示
- [ ] 没有敏感信息（密码、token 等）

---

## 🎓 提交给讲师 / Submit to Lecturer

### 方式 1：发送仓库链接
```
GitHub 仓库: https://github.com/你的用户名/posture-monitoring-system
```

### 方式 2：邮件模板

**主题**: Computer Vision Project Submission - Posture Monitoring System

**正文**:
```
Dear Professor [讲师名字],

I am pleased to submit my Computer Vision project: Real-Time Vision-Based Posture Monitoring System.

GitHub Repository: https://github.com/你的用户名/posture-monitoring-system

Project Highlights:
- Phase 1: Offline validation tool (96.88% accuracy)
- Phase 2: Real-time web application (30 FPS)
- SCI patient optimized thresholds
- Comprehensive English documentation

The repository includes:
1. Complete source code (Python & JavaScript)
2. Detailed README with usage instructions
3. Phase 1: Dataset evaluation script
4. Phase 2: Web application (can be tested directly)

Please let me know if you need any clarification.

Best regards,
[你的名字]
```

---

## 🌟 可选：美化你的 GitHub 仓库

### 添加 Topics（标签）
在仓库页面点击 "Add topics"，添加：
- `computer-vision`
- `pose-estimation`
- `mediapipe`
- `healthcare`
- `machine-learning`
- `spinal-cord-injury`
- `accessibility`

### 添加仓库描述
在 "About" 部分添加：
```
Real-time posture monitoring system using MediaPipe Pose, optimized for SCI patients with 96.88% accuracy
```

### 启用 GitHub Pages（可选）
如果想让讲师直接在线测试 Phase 2 web app：

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` → `/phase2_web_application`
4. Save

几分钟后，web app 会在线上运行！

---

## 📞 需要帮助？

如果遇到问题：
1. 检查错误信息
2. 参考上面的"常见问题"部分
3. 访问 GitHub 文档: https://docs.github.com

---

**祝你提交顺利！Good luck with your submission! 🎓**

