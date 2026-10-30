---
title: Getting started
description: Build the Straum broker, start it on loopback, and produce and consume messages with straum-cli and the Go SDK.
---

Straum is experimental. Version 0 runs on one node, with one partition per
topic, listens on loopback only (it has no authentication yet), and its
protocol and storage formats may change incompatibly. It is not for
production. What it promises is in [Guarantees](../../reference/guarantees/).

Checked against straum `ed502c5`, straum-cli v0.1.0 and straum-go-sdk
v0.1.0.

## Build and start the broker

There is no release of the version 0 broker yet, so build it from source.
You need Rust 1.95 or later. Linux is the target platform. macOS works for
development, but there an acknowledgement does not mean the data is on
stable storage.

```bash
git clone https://github.com/straum-io/straum && cd straum
cargo run --release -p straum-broker -- \
    --data-dir /tmp/straum-data --cluster-id dev --node-id 1 --listen 127.0.0.1:7171
```

The binary is `target/release/straum-server`; later starts can run it
directly with the same flags. The broker refuses a `--listen` address that
is not loopback. The data directory keeps the cluster id and node id of its
first start and refuses others. Ctrl-C stops the broker after it commits
the requests it has queued. Every setting is in the
[broker's README](https://github.com/straum-io/straum/blob/main/crates/straum-broker/README.md).

## Produce and consume with straum-cli

Download the archive for your platform from the
[v0.1.0 release](https://github.com/straum-io/straum-cli/releases/tag/v0.1.0)
(Linux, macOS and Windows; amd64 and arm64), check it against
`checksums.txt`, and put `straum-cli` on your `PATH`. For Linux on amd64:

```bash
curl -fLO https://github.com/straum-io/straum-cli/releases/download/v0.1.0/straum-cli_0.1.0_linux_amd64.tar.gz
curl -fLO https://github.com/straum-io/straum-cli/releases/download/v0.1.0/checksums.txt
sha256sum --ignore-missing -c checksums.txt     # macOS: shasum -a 256 --ignore-missing -c checksums.txt
tar xzf straum-cli_0.1.0_linux_amd64.tar.gz straum-cli
```

Or build it with Go 1.26.5 or later:
`go install github.com/straum-io/straum-cli@v0.1.0`.

In another terminal, with the broker running (the CLI's default address is
`127.0.0.1:7171`):

```bash
straum-cli ping
straum-cli topic create orders
straum-cli produce orders 'first order' 'second order' --key customer-7
printf 'line one\nline two\n' | straum-cli produce orders --stdin
straum-cli consume orders
straum-cli consume orders --follow -o json     # Ctrl-C to stop
```

`produce` prints one line per acknowledgement, after the broker has
written and synced the messages. `consume` prints the partition, seq,
timestamp, key and body of each message. The broker keeps no consumer
positions: `consume orders --name billing` saves where it stopped on your
machine, so the next run with the same name reads only new messages.

Each outcome has its own exit code. For example, `topic create` of an
existing topic exits 4 (refused by the broker), and a `produce` whose
answer was lost exits 5: the messages may or may not be stored, and
sending them again may store them twice, because version 0 has no
idempotent produce. The codes, commands and JSON output are in the
[straum-cli README](https://github.com/straum-io/straum-cli#readme).

## Produce and consume with the Go SDK

You need Go 1.26.0 or later. In a new directory:

```bash
go mod init example.com/hello
go get github.com/straum-io/straum-go-sdk@v0.1.0
```

Save this as `main.go`. It creates the topic unless it exists, produces one
message with a key and a header, then reads partition 0 from seq 0 up to
that message.

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/straum-io/straum-go-sdk/admin"
	"github.com/straum-io/straum-go-sdk/client"
	"github.com/straum-io/straum-go-sdk/consumer"
	"github.com/straum-io/straum-go-sdk/producer"
	"github.com/straum-io/straum-go-sdk/straumerr"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	c, err := client.New(ctx, client.Config{Addrs: []string{"127.0.0.1:7171"}})
	if err != nil {
		log.Fatal(err)
	}
	defer c.Close()

	err = admin.New(c).CreateTopic(ctx, "orders", admin.TopicConfig{})
	if err != nil && !errors.Is(err, straumerr.TopicExists) {
		log.Fatal(err)
	}

	ack, err := producer.New(c, producer.Options{}).Produce(ctx, "orders", client.Message{
		Key:     []byte("customer-42"),
		Headers: []client.Header{{Name: []byte("source"), Value: []byte("web")}},
		Body:    []byte(`{"order": 1001}`),
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("produced: partition %d, seq %d\n", ack.Partition, ack.BaseSeq)

	// Read the partition from seq 0 up to and including the message just produced.
	it := consumer.New(c, consumer.Options{}).Iterator("orders", ack.Partition, 0)
	for {
		m, err := it.Next(ctx)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("seq %d key %q body %s\n", m.Seq, m.Key, m.Body)
		if m.Seq == ack.BaseSeq {
			break
		}
	}
	fmt.Println("next position:", it.Position())
}
```

```bash
go run .
```

The iterator keeps its position in memory; a program that resumes later
stores `it.Position()` itself and passes it as the starting seq. The
packages are `client`, `producer`, `consumer`, `admin` and `straumerr`; their
documentation and examples are in the
[straum-go-sdk repository](https://github.com/straum-io/straum-go-sdk).

## Next

- [Protocol](../../reference/protocol/): the binary protocol, version 0, for
  writing a client in another language.
- [Guarantees](../../reference/guarantees/): what an acknowledgement means,
  what survives a crash, recovery, ordering, deduplication and the limits of
  version 0.
