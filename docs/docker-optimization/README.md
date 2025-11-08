# Dockerfile Optimization Guide

This directory contains comprehensive documentation for optimizing the Bluelight Hub Dockerfile structure.

## Quick Start (Read in This Order)

1. **DOCKERFILE-OPTIMIZATION-SUMMARY.md** - Start here! Executive summary of all changes
2. **workdir-guide.md** - Understanding WORKDIR best practices
3. **dockerfile-plan.md** - Detailed analysis of current issues and solutions
4. **comparison.md** - Before/after code comparison and performance impact
5. **Dockerfile.optimized** - The ready-to-use optimized Dockerfile

## Document Descriptions

### DOCKERFILE-OPTIMIZATION-SUMMARY.md
- Executive summary of optimization plan
- Key recommendations at a glance
- Performance comparison tables
- Migration steps and testing checklist
- FAQ and common issues
- **Read first if you want quick overview**

### dockerfile-plan.md
- Comprehensive issue analysis (5 major problems)
- Detailed explanation of each issue
- File copying strategy for each stage
- Current vs optimized performance breakdown
- API client generation explanation
- Implementation checklist
- **Read for deep understanding of changes**

### Dockerfile.optimized
- Complete optimized Dockerfile with inline comments
- Ready to use as replacement for current Dockerfile
- Annotations explaining each section and why
- **Use this file to update your actual Dockerfile**

### comparison.md
- Side-by-side before/after code examples
- Line-by-line changes explained
- Performance impact comparison (time + size)
- Code quality improvements table
- Testing instructions
- **Reference when implementing changes**

### workdir-guide.md
- Why WORKDIR matters over cd commands
- WORKDIR rules and best practices
- Project-specific examples
- Anti-patterns to avoid
- Quick reference checklist
- **Review to understand best practices**

## Key Improvements

| Issue | Impact | Solution |
|-------|--------|----------|
| Shared built 2x | 13% slower | Dedicated shared-builder stage |
| Using cd instead of WORKDIR | Context loss bugs | Replace with explicit WORKDIR |
| Oversized production image | 8% bigger | Copy only dist, not source code |
| Confusing WORKDIR switching | Unclear code | Single WORKDIR in production |

## Implementation Path

### Phase 1: Understanding (15 min)
- Read DOCKERFILE-OPTIMIZATION-SUMMARY.md
- Review workdir-guide.md examples

### Phase 2: Planning (10 min)
- Review dockerfile-plan.md section structure
- Check comparison.md for exact changes needed

### Phase 3: Implementation (20 min)
- Compare current Dockerfile with Dockerfile.optimized
- Update your Dockerfile with optimized version
- Test with: `DOCKER_BUILDKIT=1 docker build -t test .`

### Phase 4: Validation (10 min)
- Verify image builds without errors
- Check image size: `docker images`
- Run container and verify startup
- Time the build for before/after comparison

## Performance Expected

### Build Time
- **Before**: ~155 seconds
- **After**: ~135 seconds  
- **Improvement**: 13% faster

### Image Size
- **Before**: ~260MB
- **After**: ~240MB
- **Reduction**: 8% smaller

### Rebuild Benefits
- Frontend change only: 10s faster (shared cached)
- Backend change only: 10s faster (shared cached)

## Testing Checklist

- [ ] Read DOCKERFILE-OPTIMIZATION-SUMMARY.md
- [ ] Review dockerfile-plan.md stage structure
- [ ] Compare current vs optimized Dockerfile
- [ ] Backup current Dockerfile (git does this)
- [ ] Replace Dockerfile with optimized version
- [ ] Build: `DOCKER_BUILDKIT=1 docker build -t test:latest .`
- [ ] Check size: `docker images test`
- [ ] Run: `docker run --rm -it -p 3000:3000 test:latest`
- [ ] Verify app starts correctly
- [ ] Commit with message: `🐛(docker): Optimize Dockerfile structure`

## When to Apply This

**Good time to apply**:
- During regular maintenance
- Before next deployment
- When optimizing build pipeline
- As part of Docker/infrastructure improvements

**Not urgent if**:
- Current build time is acceptable
- Docker image size not a constraint
- Deployment frequency is low

## Questions?

Refer to the FAQ section in DOCKERFILE-OPTIMIZATION-SUMMARY.md for common questions and answers.

## Key Files You'll Update

- `Dockerfile` - Replace with optimized version from docs/docker-optimization/Dockerfile.optimized
- `.dockerignore` - No changes needed (already optimized)
- `docker-compose.yml` - No changes needed (uses Dockerfile as-is)

## Important Notes

1. **API Client**: Pre-generated in packages/shared/client/. No changes to generation workflow needed.

2. **BuildKit**: Recommended but optional. Use `DOCKER_BUILDKIT=1` for better caching.

3. **Backward Compatibility**: Optimized Dockerfile produces identical runtime behavior to current one.

4. **Commit Message**: Use semantic emoji: `🐛(docker): Optimize Dockerfile structure - eliminate redundant shared builds`

---

**Last Updated**: November 2024
**Project**: Bluelight Hub
**Status**: Ready for implementation
