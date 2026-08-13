package model

import (
	"sync"
	"time"
)

type Clock struct {
	mu          sync.Mutex
	timeLeft    time.Duration
	lastStarted time.Time // When the clock was last started
	isRunning   bool
}

func NewClock(initialTime time.Duration) *Clock {
	return &Clock{
		timeLeft:  initialTime,
		isRunning: false,
	}
}

func (c *Clock) Start() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.isRunning {
		c.lastStarted = time.Now()
		c.isRunning = true
	}
}

func (c *Clock) Stop() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.isRunning {
		c.timeLeft -= time.Since(c.lastStarted)
		if c.timeLeft < 0 {
			c.timeLeft = 0
		}
		c.isRunning = false
	}
}

// TimeLeft is the time remaining right now, counting down while the clock runs.
// It never reports less than zero.
func (c *Clock) TimeLeft() time.Duration {
	c.mu.Lock()
	defer c.mu.Unlock()

	remaining := c.timeLeft
	if c.isRunning {
		remaining -= time.Since(c.lastStarted)
	}
	if remaining < 0 {
		return 0
	}
	return remaining
}

// Deciseconds is TimeLeft in the tenths-of-a-second unit the client renders.
func (c *Clock) Deciseconds() int {
	return int(c.TimeLeft().Milliseconds() / 100)
}
