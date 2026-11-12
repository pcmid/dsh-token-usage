# pcmid fork

Branch `pcmid` is upstream [`v0.4.15`](https://github.com/LaoYueHanNi/dsh-token-usage/tree/v0.4.15) plus:

- `fix(cost)`: the cost pill no longer shrinks with the composer dock, so on a narrow screen (a phone) its figure no longer overflows onto the context meter.

The built `lib/` is committed so DSH can install the fork straight from Git (`git+https://github.com/pcmid/dsh-token-usage.git#<commit>`); upstream builds it only when publishing to npm. Versions are `<upstream>-pcmid.<n>`.

The [pcmid/dsh-plugins](https://github.com/pcmid/dsh-plugins) market index points at a commit on this branch. Drop the fork once upstream ships the fix on npm.
