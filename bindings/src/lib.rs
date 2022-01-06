use std::{
  sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
  },
  thread::{self, JoinHandle},
  time::Duration,
};

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction},
  JsNumber,
};

#[macro_use]
extern crate napi_derive;

#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
  a + b
}

pub struct Repeater {
  handle: Option<JoinHandle<Result<()>>>,
  quit: Arc<AtomicBool>,
}

impl Repeater {
  /// Spawn a thread to repeatedly call the callback every `how_often` milliseconds.
  pub fn new<F>(callback: F, how_often: u64) -> Repeater
  where
    F: Fn(u32) -> () + Send + 'static,
  {
    let quit = Arc::new(AtomicBool::new(false));

    let should_quit = quit.clone();
    let handle = thread::spawn(move || actual_work(callback, how_often, should_quit));

    Repeater {
      handle: Some(handle),
      quit,
    }
  }
}

fn actual_work<F: Fn(u32) -> ()>(
  callback: F,
  how_often: u64,
  should_quit: Arc<AtomicBool>,
) -> Result<()> {
  let mut i = 0;
  while !should_quit.load(Ordering::SeqCst) {
    thread::sleep(Duration::from_millis(how_often));
    callback(i);
    i += 1;
  }

  Ok(())
}

impl Drop for Repeater {
  fn drop(&mut self) {
    self.quit.store(true, Ordering::SeqCst);

    if let Some(thread) = self.handle.take() {
      println!("joining Repeater thread...");
      let _ = thread.join();
      println!("joined");
    }
  }
}

#[napi]
pub struct JsRepeater {
  inner: Repeater,
}

#[napi]
impl JsRepeater {
  #[napi(constructor)]
  pub fn new(callback: JsFunction) -> Result<Self> {
    // Create a threadsafe function around the given callback
    let ts_callback: ThreadsafeFunction<u32> =
      callback.create_threadsafe_function(0, send_update)?;

    let r = Repeater::new(
      move |val| {
        ts_callback.call(
          Ok(val),
          napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking,
        );
      },
      500,
    );

    Ok(JsRepeater { inner: r })
  }
}

fn send_update(ctx: ThreadSafeCallContext<u32>) -> Result<Vec<JsNumber>> {
  ctx.env.create_uint32(ctx.value).map(|v| vec![v])
}
